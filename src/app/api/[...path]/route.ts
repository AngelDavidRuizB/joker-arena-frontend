import { proxyToGateway } from '../../../lib/server/proxy';

export const dynamic = 'force-dynamic';

/**
 * `/api/*` → gateway (`/api/*`), excepto `/api/health`, que tiene su propio route handler.
 * Se resuelve en tiempo de ejecución: GATEWAY_INTERNAL_URL puede cambiarse sin recompilar.
 */
async function handler(request: Request, { params }: { params: { path: string[] } }) {
  return proxyToGateway(request, `/api/${params.path.join('/')}`);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
