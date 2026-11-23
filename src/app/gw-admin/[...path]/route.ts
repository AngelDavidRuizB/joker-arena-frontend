import { proxyToGateway } from '../../../lib/server/proxy';

export const dynamic = 'force-dynamic';

/**
 * `/gw-admin/*` → gateway `/admin/*` (editor de LiveOps y radar del clúster de la consola
 * de administración). El prefijo `/gw-admin` evita chocar con la página `/admin`.
 */
async function handler(request: Request, { params }: { params: { path: string[] } }) {
  return proxyToGateway(request, `/admin/${params.path.join('/')}`);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
