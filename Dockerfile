# ==============================================================================
# web-ssr (Next.js 14, Server-Side Rendering) - multi-etapa, salida standalone, no-root
# ==============================================================================
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
# La URL pública del WebSocket se incrusta en el bundle del navegador al compilar.
# GATEWAY_INTERNAL_URL, en cambio, se lee en TIEMPO DE EJECUCIÓN (src/lib/server/proxy.ts),
# así que se puede cambiar con `docker run -e` / `environment:` sin recompilar.
COPY . .
ARG NEXT_PUBLIC_GATEWAY_WS_URL=""
ENV NEXT_PUBLIC_GATEWAY_WS_URL=$NEXT_PUBLIC_GATEWAY_WS_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
