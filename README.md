> [!WARNING]
> **Repositorio archivado (Prototipo 1).** Este cliente web (React + Vite) corresponde únicamente al Prototipo 1 y se conserva como referencia histórica (etiqueta `p1-final`). A partir del Prototipo 2 y en el Prototipo 3, el cliente web (`clients/web-ssr`, Next.js SSR) reside en el repositorio unificado: [AngelDavidRuizB/joker-arena-backend](https://github.com/AngelDavidRuizB/joker-arena-backend).

# Joker Arena - Frontend Web Client 🃏✨

Cliente web de **JokerArena: Multiverse Poker Engine** con **Server-Side Rendering**: **Next.js 14 (App Router)**, **React 18**, **TypeScript** y **Tailwind CSS**, compilado con la salida `standalone` de Next y desplegable en Docker.

Este repositorio es la **casa oficial del frontend**. El backend (`joker-arena-backend`) ya no contiene clientes web: expone únicamente el **API Gateway** (`:8080`) con los microservicios.

---

## 🖥️ Qué se renderiza en el servidor

| Página | Renderizado | Datos | Fuente |
|---|---|---|---|
| `/` | cliente | registro (**usuario**, contraseña, repetir contraseña) e inicio de sesión (usuario + contraseña) — `/api/auth/register` · `/api/auth/login` | auth-identity-ms |
| `/lobby` | **servidor** (lista de salas) + formulario interactivo | `/api/rooms?status=...` | rooms-lobby-ms |
| `/room/{code}` | cliente (WebSocket) | `/ws/{code}?token=` | game-engine-ms |
| `/leaderboard` | **servidor** | `/api/leaderboard/top` | leaderboard-stats-ms |
| `/matches/{id}` | **servidor** | `/api/telemetry/matches/{id}` | telemetry-ms |
| `/admin` | cliente (rol `admin`) | editor de reglas (LiveOps) + radar del clúster | liveops-rules-ms / cluster-monitor-ms |
| `/api/health` | route handler | healthcheck del propio frontend | — |

Cómo se comprueba el SSR: en `/leaderboard` o `/lobby`, "ver código fuente" del navegador muestra el **HTML ya armado con los datos** (no un `<div id="root">` vacío).

### Cómo habla con el backend

```
navegador ──(mismo origen /api/*, rewrite de Next)──▶ servidor Next ──▶ API Gateway :8080 ──▶ microservicios
navegador ──(WebSocket directo, ?token=JWT)──────────────────────────▶ API Gateway :8080
```

- Las páginas SSR llaman al gateway por la **red interna** con `GATEWAY_INTERNAL_URL` (por defecto `http://localhost:8080`) y el JWT de la cookie `ja_token` (`src/lib/server/gateway.ts`).
- El navegador pide `/api/*` (y `/gw-admin/*`) al **mismo origen** y el servidor de Next lo reenvía al gateway en **tiempo de ejecución** (`src/lib/server/proxy.ts`): no hay CORS, no se expone ningún microservicio y la URL del gateway se puede cambiar con una variable de entorno sin recompilar.
- El WebSocket del juego va directo al gateway: `NEXT_PUBLIC_GATEWAY_WS_URL` o, por defecto, `ws://<host>:8080`.

---

## 🛠️ Tecnologías

- [Next.js 14](https://nextjs.org/) (App Router, Server Components + páginas SSR dinámicas)
- [React 18](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) · [Framer Motion](https://www.framer.com/motion/) · [Lucide Icons](https://lucide.dev/)
- [Zustand](https://zustand.docs.pmnd.rs/) (sesión y estado de la mesa) · [Sonner](https://sonner.emilkowal.ski/) (toasts)
- [Vitest](https://vitest.dev/) + Testing Library

---

## 📋 Requisitos

- Node.js 18.17+ (la imagen Docker usa `node:22-alpine`)
- `npm`
- Opcional: Docker para el despliegue en contenedor
- Opcional: el backend levantado (`joker-arena-backend`) para tener datos reales

---

## 💻 Desarrollo local

```bash
npm install
```

```bash
# El servidor de Next necesita saber dónde está el gateway para el SSR
GATEWAY_INTERNAL_URL=http://localhost:8080 npm run dev
```

En PowerShell:

```powershell
$env:GATEWAY_INTERNAL_URL='http://localhost:8080'; npm run dev
```

Aplicación disponible en `http://localhost:3000`.

| Script | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo con SSR en el puerto 3000 |
| `npm run build` | compila la app (`.next/standalone`) |
| `npm run start` | sirve la compilación de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | pruebas unitarias/componentes con Vitest |
| `npm run test:watch` | Vitest en modo watch |

Variables de entorno: ver [`.env.example`](.env.example).

---

## 🐳 Docker

> ⚠️ **Si usas PowerShell (Windows):** la continuación de línea es un *backtick* (`` ` ``), **no** una barra invertida `\`. Un comando copiado de un ejemplo `bash` con `\` falla con `docker: invalid reference format` y `-e : El término '-e' no se reconoce...`. Usa las versiones de una sola línea que aparecen abajo.

La imagen es multi-etapa (`node:22-alpine` → salida standalone, usuario `node`, healthcheck en `/api/health`).

**Recomendado (funciona igual en PowerShell, CMD y bash):**

```bash
docker compose up -d --build --wait
```

`compose.yml` construye la imagen, publica `${WEB_PORT:-3000}` y apunta `GATEWAY_INTERNAL_URL` a `http://jokerarena-gateway:8080` dentro de la red `jokerarena-net`.

**Alternativa manual — una sola línea (copia y pega en PowerShell/CMD/bash):**

```bash
docker build -t jokerarena-web-ssr . && docker run -d --name jokerarena-web-ssr -p 3000:3000 -e GATEWAY_INTERNAL_URL=http://host.docker.internal:8080 jokerarena-web-ssr
```

El mismo comando con continuación de línea, según tu shell:

```bash
# bash / zsh
docker run -d --name jokerarena-web-ssr -p 3000:3000 \
  -e GATEWAY_INTERNAL_URL=http://host.docker.internal:8080 \
  jokerarena-web-ssr
```

```powershell
# PowerShell (el carácter de continuación es el backtick ` al final de la línea)
docker run -d --name jokerarena-web-ssr -p 3000:3000 `
  -e GATEWAY_INTERNAL_URL=http://host.docker.internal:8080 `
  jokerarena-web-ssr
```

```bat
:: CMD (el carácter de continuación es ^)
docker run -d --name jokerarena-web-ssr -p 3000:3000 ^
  -e GATEWAY_INTERNAL_URL=http://host.docker.internal:8080 ^
  jokerarena-web-ssr
```

Notas:
- `host.docker.internal` es el host visto desde el contenedor en **Docker Desktop** (Windows/macOS). En Linux usa `--network jokerarena-net -e GATEWAY_INTERNAL_URL=http://jokerarena-gateway:8080` o añade `--add-host=host.docker.internal:host-gateway`.
- Comprobar que quedó arriba: `curl http://localhost:3000/api/health` (debe responder `{"status":"ok","service":"web-ssr",...}`).
- Si el nombre ya existe: `docker rm -f jokerarena-web-ssr` y vuelve a lanzarlo.

**Con el ecosistema completo (red del backend):**

```bash
# 1) backend arriba (crea la red jokerarena-net)
cd ../joker-arena-backend && docker compose -f docker-compose.p2.yml up -d --build --wait
# 2) frontend unido a esa red
cd ../joker-arena-frontend && docker compose up -d --build --wait
```

Si el backend no está levantado, la red externa debe existir primero: `docker network create jokerarena-net` (en PowerShell es el mismo comando, sin `\`).

---

## 🩺 Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `docker: invalid reference format` y `-e : El término '-e' no se reconoce...` | Pegaste un comando multilínea de **bash** en **PowerShell**: `\` no continúa líneas ahí | Usa el comando en **una sola línea** o el backtick `` ` `` al final de cada línea |
| `network jokerarena-net declared as external, but could not be found` | La red del backend aún no existe | `docker network create jokerarena-net` o levanta primero el backend |
| `Ports are not available ... bind: address already in use` (3000) | Otro `npm run dev` o contenedor en el puerto | `docker ps`, cierra el otro proceso, o cambia `WEB_PORT=3001` |
| `Conflict. The container name "/jokerarena-web-ssr" is already in use` | Ya hay un contenedor con ese nombre | `docker rm -f jokerarena-web-ssr` |
| Las páginas SSR dicen «No se pudo contactar el API Gateway» | `GATEWAY_INTERNAL_URL` incorrecto o backend caído | Docker Desktop: `http://host.docker.internal:8080`; en la red del backend: `http://jokerarena-gateway:8080` |
| La cuenta se queda bloqueada tras varios intentos | 5 fallos de credenciales (login o registro) → `423 account_locked` durante 15 min | Espera el tiempo indicado en el mensaje (se configura con `AUTH_LOCKOUT_MINUTES` en el backend) o desbloquea: `docker exec jokerarena-redis redis-cli del auth:lock:<usuario> auth:fail:<usuario>` |
| `/api/*` responde `500` o `503 {"error":"service_unavailable"}` | El servidor de Next no alcanza el gateway (`GATEWAY_INTERNAL_URL`) | Revisa la variable del contenedor (`docker exec jokerarena-web-ssr printenv GATEWAY_INTERNAL_URL`) y que el gateway esté arriba |
| `next start` avisa «does not work with "output: standalone"» | Aviso esperado con salida standalone | Usa Docker, o `node .next/standalone/server.js` (el aviso no impide servir la app) |
| `npm : no se puede cargar el archivo ... la ejecución de scripts está deshabilitada` (PowerShell) | Política de ejecución | `Set-ExecutionPolicy -Scope Process Bypass` |

---

## 📁 Estructura

```
src/
├─ app/                 # App Router: layout raíz, páginas SSR y route handler /api/health
│  ├─ lobby/            # SSR: lista de salas desde el gateway
│  ├─ leaderboard/      # SSR: ranking global
│  ├─ matches/[id]/     # SSR: auditoría mano a mano
│  ├─ room/[code]/      # cliente: mesa en tiempo real
│  └─ admin/            # cliente: consola de administración
├─ components/          # UI de la mesa, HUD, cascada, paneles
├─ lib/                 # cartas, cascada de puntuación, tipos, validación
│  └─ server/           # solo-servidor: gateway.ts (SSR con JWT) y proxy.ts (/api → gateway)
├─ store/               # Zustand: sesión (cookie + localStorage) y partida
├─ ws/gameSocket.ts     # cliente WebSocket con reconexión y backoff
└─ test/                # Vitest + Testing Library
```

---

## 📄 Licencia

Proyecto académico — Arquitectura de Software 2026-II, Universidad Nacional de Colombia.
