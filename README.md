# JokerArena · Cliente Web SSR 🃏✨

Cliente web de **JokerArena: Multiverse Poker Engine** con **Server-Side Rendering**: **Next.js 14 (App Router)**, **React 18**, **TypeScript** y **Tailwind CSS**, compilado con la salida `standalone` de Next y desplegado en Docker.

Este repositorio es la **casa oficial del frontend**. En el **Prototipo 3** la web no publica puertos: se sirve **a través del reverse proxy con TLS del backend**, en **https://localhost**, y se une a la red **`edge-net`**. El backend ([`joker-arena-backend`](https://github.com/AngelDavidRuizB/joker-arena-backend)) expone los microservicios detrás de su **API Gateway**.

---

## 🚀 Arranque (proyecto completo)

El orden importa: el backend crea la red `edge-net`, los certificados y el reverse proxy; luego se levanta esta web.

```bash
# 1) Backend: .env, certificados TLS y 15 contenedores (incluye el reverse proxy)
cd ../joker-arena-backend
cp .env.example .env
bash scripts/gen_certs.sh
docker compose -f docker-compose.p2.yml up -d --build --wait

# 2) Cliente web (este repositorio): se une a edge-net, sin puertos publicados
cd ../joker-arena-frontend
docker compose up -d --build --wait

# 3) Comprobar el sistema completo
cd ../joker-arena-backend && bash scripts/verify.sh
```

| Qué | URL |
|---|---|
| **Aplicación web** | **https://localhost** |
| API (mismo origen, por el proxy) | `https://localhost/api/*` |
| WebSocket del juego | `wss://localhost/ws/{code}?token=<jwt>` |
| Consola de administración | https://localhost/admin con el usuario `admin` y `ADMIN_PASSWORD` |

> El certificado lo firma una **CA local**. Importa `../joker-arena-backend/edge/certs/jokerarena-ca.crt` en tu navegador para que `https://localhost` aparezca como seguro.

Si el backend no está levantado y necesitas arrancar solo la web, crea la red antes: `docker network create edge-net`.

---

## 🖥️ Qué se renderiza en el servidor

| Página | Renderizado | Datos | Fuente |
|---|---|---|---|
| `/` | cliente | registro (**usuario**, contraseña, repetir contraseña) e inicio de sesión — `/api/auth/register` · `/api/auth/login` | auth-identity-ms |
| `/lobby` | **servidor** (lista de salas) + formulario interactivo | `/api/rooms?status=...` | rooms-lobby-ms |
| `/room/{code}` | cliente (WebSocket) | `/ws/{code}?token=` | game-engine-ms |
| `/leaderboard` | **servidor** | `/api/leaderboard/top` | leaderboard-stats-ms |
| `/matches/{id}` | **servidor** | `/api/telemetry/matches/{id}` | telemetry-ms |
| `/admin` | cliente (rol `admin`) | editor de reglas (LiveOps) + radar del clúster | liveops-rules-ms / cluster-monitor-ms |

Cómo se comprueba el SSR: en `/leaderboard` o `/lobby`, "ver código fuente" del navegador muestra el **HTML ya armado con los datos**.

### Cómo habla con el backend

```
navegador ──HTTPS/WSS──▶ reverse proxy (:443) ──▶ API Gateway ──▶ microservicios
servidor Next ──red edge-net──▶ API Gateway (http://jokerarena-gateway:8080)
```

- **Páginas SSR:** el servidor de Next llama al gateway por la red `edge-net` con `GATEWAY_INTERNAL_URL` y el JWT de la cookie `ja_token` (`src/lib/server/gateway.ts`).
- **Navegador:** todas las llamadas REST salen al **mismo origen** (`/api/*`); en el P3 el **reverse proxy** las enruta al API Gateway (`edge/reverse-proxy/locations.conf`), así que no hay CORS y tampoco se expone ningún microservicio.
- **WebSocket:** va al mismo origen (`wss://localhost/ws/...`), que el proxy enruta al gateway. Solo si se sirve desde otro host se define `NEXT_PUBLIC_GATEWAY_WS_URL`.
- **Proxy propio de Next** (`src/app/api/[...path]/route.ts` + `src/lib/server/proxy.ts`): reenvía `/api/*` y `/gw-admin/*` al gateway **en tiempo de ejecución**. Es lo que se usa al trabajar en local (`npm run dev`) o al acceder a la web sin el reverse proxy; con el proxy del P3 delante, esas rutas las resuelve él antes.

---

## 🛠️ Tecnologías

- [Next.js 14](https://nextjs.org/) (App Router, Server Components + páginas SSR dinámicas)
- [React 18](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) · [Framer Motion](https://www.framer.com/motion/) · [Lucide Icons](https://lucide.dev/)
- [Zustand](https://zustand.docs.pmnd.rs/) (sesión y estado de la mesa) · [Sonner](https://sonner.emilkowal.ski/) (toasts)
- [Vitest](https://vitest.dev/) + Testing Library

---

## 📋 Requisitos

- **Docker** con Compose v2 (para el modo completo). La imagen usa `node:22-alpine`.
- El **backend del P3 levantado** (`docker-compose.p2.yml`): crea la red `edge-net`, el reverse proxy con TLS en `https://localhost` y el API Gateway.
- **Node.js 20+** y `npm` solo si vas a desarrollar la web en local (sin Docker).
- La **CA local** del backend importada en el navegador (`../joker-arena-backend/edge/certs/jokerarena-ca.crt`).

---

## 🐳 Docker (modo ecosistema, recomendado)

```bash
docker compose up -d --build --wait
```

`compose.yml` construye la imagen (salida `standalone`), se une a la red externa **`edge-net`** y deja el contenedor `jokerarena-web-ssr` **sin puertos publicados**: el reverse proxy lo alcanza como `jokerarena-web-ssr:3000`.

| Variable del compose | Valor por defecto | Para qué |
|---|---|---|
| `GATEWAY_INTERNAL_URL` | `http://jokerarena-gateway:8080` | lo usan las páginas SSR para llamar al gateway por `edge-net` |
| `NEXT_PUBLIC_GATEWAY_WS_URL` (build arg) | vacío | si se define, sobrescribe la URL del WebSocket que usa el navegador (por defecto, mismo origen) |

Comprobaciones:

```bash
docker ps --filter name=jokerarena-web-ssr --format '{{.Names}} | {{.Status}}'   # healthy
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' jokerarena-web-ssr   # edge-net
curl --cacert ../joker-arena-backend/edge/certs/jokerarena-ca.crt https://localhost/                 # 200 (HTML de la web)
curl --cacert ../joker-arena-backend/edge/certs/jokerarena-ca.crt https://localhost/health           # 200 (gateway)
```

Para detener solo la web: `docker compose down`.

---

## 💻 Desarrollo local (sin Docker para la web)

1. Publica el gateway en `localhost:8080` con el compose de depuración del backend:

```bash
cd ../joker-arena-backend
docker compose -f docker-compose.p2.yml -f docker-compose.debug.yml up -d
```

2. Arranca Next en modo desarrollo:

```bash
cd ../joker-arena-frontend
npm ci
GATEWAY_INTERNAL_URL=http://localhost:8080 NEXT_PUBLIC_GATEWAY_WS_URL=ws://localhost:8080 npm run dev
```

```powershell
# PowerShell
$env:GATEWAY_INTERNAL_URL='http://localhost:8080'; $env:NEXT_PUBLIC_GATEWAY_WS_URL='ws://localhost:8080'; npm run dev
```

La web queda en **http://localhost:3000**. En este modo las llamadas del navegador `/api/*` las reenvía el propio servidor de Next (`src/lib/server/proxy.ts`) y el WebSocket apunta directo al gateway publicado (`ws://localhost:8080`) porque Next no hace proxy de WebSockets.

Variables de entorno: ver [`.env.example`](.env.example).

| Script | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo con SSR en el puerto 3000 |
| `npm run build` | compila la app (`.next/standalone`) |
| `npm run start` | sirve la compilación de producción (para local; en Docker se usa la salida standalone) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | pruebas unitarias/componentes con Vitest |
| `npm run test:watch` | Vitest en modo watch |

---

## 🧪 Pruebas

```bash
npm ci
npm run typecheck
npm test          # 70 pruebas: validaciones, cascada, store, WebSocket, componentes y pantalla de acceso
npm run build     # valida la compilación de producción
```

La verificación del despliegue completo se hace desde el backend: `bash scripts/verify.sh` (incluye `https://localhost/` → 200 con la web).


---

## 🩺 Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `https://localhost` responde **502 Bad Gateway** | El contenedor de la web no está levantado o no está en `edge-net` | `cd ../joker-arena-frontend && docker compose up -d --build --wait` y `docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' jokerarena-web-ssr` |
| `network edge-net declared as external, but could not be found` | El backend aún no está levantado (él crea la red) | Levanta primero el backend o `docker network create edge-net` |
| El navegador avisa del certificado en `https://localhost` | La CA local no está instalada | Importa `../joker-arena-backend/edge/certs/jokerarena-ca.crt` como autoridad de confianza |
| `jokerarena-reverse-proxy` en bucle: `nginx: [emerg] cannot load certificate .../server.crt` | Faltan los certificados del borde (no están en git) | `cd ../joker-arena-backend && bash scripts/gen_certs.sh && docker compose -f docker-compose.p2.yml up -d --force-recreate jokerarena-reverse-proxy` |
| Las páginas SSR dicen «No se pudo contactar el API Gateway» | `GATEWAY_INTERNAL_URL` incorrecto o gateway caído | En Docker debe ser `http://jokerarena-gateway:8080`; en local, `http://localhost:8080` con el gateway publicado (`docker-compose.debug.yml`) |
| `/api/*` responde `502`/`503` | El gateway no está sano o la web no está en `edge-net` | `docker ps` (gateway `healthy`), `docker inspect … Networks` y `docker logs jokerarena-gateway` |
| La cuenta queda bloqueada tras varios intentos | 5 fallos de credenciales (login o registro) → `423 account_locked` | Espera el tiempo del mensaje (`AUTH_LOCKOUT_MINUTES`, 15 min por defecto) o `docker exec jokerarena-redis redis-cli del auth:lock:<usuario> auth:fail:<usuario>` |
| `Ports are not available ... bind: address already in use` (3000) | Solo en `npm run dev`: otro proceso usa el 3000 | Cierra el otro proceso o cambia el puerto con `npm run dev -- -p 3001` |
| `docker: invalid reference format` al pegar un comando | En PowerShell `\` **no** continúa líneas (es de bash) | Usa una sola línea o el backtick `` ` `` al final de cada línea |
| `next start` avisa «does not work with “output: standalone”» | Aviso esperado con salida standalone | En producción se usa Docker (`node server.js`); en local, `npm run dev` |
| `npm : … la ejecución de scripts está deshabilitada` (PowerShell) | Política de ejecución | `Set-ExecutionPolicy -Scope Process Bypass` |

---

## 📁 Estructura

```
src/
├─ app/                 # App Router
│  ├─ layout.tsx · page.tsx
│  ├─ lobby/ · leaderboard/ · matches/[id]/ · room/[code]/ · admin/   # páginas (SSR o cliente)
│  ├─ api/health/       # healthcheck del contenedor
│  ├─ api/[...path]/    # proxy en tiempo de ejecución: /api/* → gateway
│  └─ gw-admin/[...path]/  # proxy: /gw-admin/* → gateway /admin/*
├─ components/          # UI de la mesa, HUD, cascada, paneles
├─ lib/
│  ├─ cards.ts · cascade.ts · constants.ts · types.ts · validation.ts
│  └─ server/           # gateway.ts (SSR con JWT) y proxy.ts (/api → gateway)
├─ store/               # Zustand: sesión (cookie + localStorage) y partida
├─ ws/gameSocket.ts     # cliente WebSocket con reconexión y backoff (mismo origen / wss)
└─ test/                # Vitest + Testing Library
```

---

## 📄 Licencia

Proyecto académico — Arquitectura de Software 2026-II, Universidad Nacional de Colombia.

