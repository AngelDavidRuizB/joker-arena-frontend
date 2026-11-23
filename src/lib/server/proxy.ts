import 'server-only';

import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';

/**
 * Proxy mismo-origen hacia el API Gateway, resuelto en TIEMPO DE EJECUCIÓN.
 *
 * Los `rewrites` de Next se fijan al compilar (el destino queda grabado en el build), por lo
 * que un `docker run -e GATEWAY_INTERNAL_URL=...` no los cambiaba. Con este route handler el
 * navegador sigue hablando con el mismo origen (`/api/*`, `/gw-admin/*`) y es el servidor de
 * Next quien reenvía al gateway leyendo la variable de entorno en cada arranque.
 *
 * Se usa el módulo `http`/`https` de Node (no `fetch`): el `fetch` parcheado por Next rechaza
 * reenviar peticiones con cuerpo (`UND_ERR_NOT_SUPPORTED` de undici).
 */
const GATEWAY = (process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** Cabeceras que no tiene sentido reenviar (las recalcula Node o son hop-by-hop). */
const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'expect',
]);

/** Cabeceras de respuesta que no se deben copiar (el cuerpo ya viene decodificado). */
const SKIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

function unavailable(): Response {
  return Response.json(
    { error: 'service_unavailable', message: 'No se pudo contactar el API Gateway.' },
    { status: 503 },
  );
}

/** Reenvía la petición al gateway y devuelve su respuesta (cuerpo en streaming). */
export async function proxyToGateway(request: Request, upstreamPath: string): Promise<Response> {
  const { search } = new URL(request.url);
  let target: URL;
  try {
    target = new URL(`${GATEWAY}${upstreamPath}${search}`);
  } catch {
    console.error('[proxy] GATEWAY_INTERNAL_URL inválida:', GATEWAY);
    return unavailable();
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    if (!SKIP_REQUEST_HEADERS.has(name.toLowerCase())) headers[name] = value;
  });

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  let body: Buffer | undefined;
  if (hasBody) {
    try {
      body = Buffer.from(await request.arrayBuffer());
    } catch (error) {
      console.error('[proxy] no se pudo leer el cuerpo de la petición:', error);
      return Response.json({ error: 'invalid_request', message: 'No se pudo leer el cuerpo.' }, { status: 400 });
    }
    headers['content-length'] = String(body.byteLength);
  }

  const transport = target.protocol === 'https:' ? https : http;

  try {
    const upstream = await new Promise<http.IncomingMessage>((resolve, reject) => {
      // agent: false → conexión nueva por petición; no se reutilizan sockets cerrados por el gateway.
      const req = transport.request(target, { method: request.method, headers, agent: false }, resolve);
      req.setTimeout(15_000, () => req.destroy(new Error('timeout del gateway')));
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });

    const responseHeaders = new Headers();
    for (const [name, value] of Object.entries(upstream.headers)) {
      if (value === undefined || SKIP_RESPONSE_HEADERS.has(name.toLowerCase())) continue;
      responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
    }

    const status = upstream.statusCode ?? 502;
    const noBody = status === 204 || status === 304;
    const stream = noBody ? null : (Readable.toWeb(upstream) as unknown as ReadableStream<Uint8Array>);
    return new Response(stream, { status, headers: responseHeaders });
  } catch (error) {
    console.error('[proxy] fallo al reenviar la petición al gateway:', error);
    return unavailable();
  }
}
