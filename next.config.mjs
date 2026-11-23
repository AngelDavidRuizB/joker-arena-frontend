/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // El navegador habla con el mismo origen (/api/*, /gw-admin/*) y el servidor de Next
  // reenvía al API Gateway en TIEMPO DE EJECUCIÓN (src/lib/server/proxy.ts) leyendo
  // GATEWAY_INTERNAL_URL. Antes se usaban `rewrites`, pero Next graba su destino al compilar
  // y un `docker run -e GATEWAY_INTERNAL_URL=...` no tenía efecto (las llamadas daban 500).
};

export default nextConfig;

