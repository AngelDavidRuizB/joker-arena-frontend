# Joker Arena - Frontend Web Client 🃏✨

Frontend web de **Joker Arena: Multiverse Poker Engine**, desarrollado en **React 18**, **TypeScript**, **Tailwind CSS** y empaquetado con **Vite** servido a través de **Nginx**.

---

## 🚀 Características

- **Diseño Moderno & Responsivo**: Desarrollado con Tailwind CSS y tipografías personalizadas para atmósfera arcade/cyberpunk.
- **Visualización en Tiempo Real**: Soporte de conexión WebSocket con el Game Engine y consumo de APIs de analítica y telemetría.
- **Optimizado para Producción**: Pipeline de compilación con Vite y contenedor Nginx multi-stage ultra ligero.
- **Healthcheck Integrado**: Endpoint `/health` expuesto para comprobaciones de estado en orquestadores.

---

## 🛠️ Tecnologías Principales

- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Nginx Alpine](https://nginx.org/)

---

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- `npm` o `yarn` / `pnpm`
- Opcional: [Docker](https://www.docker.com/) para despliegue en contenedor.

---

## 💻 Instalación y Ejecución Local

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar en modo de desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible por defecto en: `http://localhost:5173`

3. **Construir para producción (Build)**:
   ```bash
   npm run build
   ```
   Los archivos estáticos generados se guardarán en la carpeta `dist/`.

4. **Previsualizar la compilación de producción**:
   ```bash
   npm run preview
   ```

---

## 🐳 Ejecución con Docker

Para construir y desplegar el contenedor de forma aislada:

```bash
# Construir la imagen Docker
docker build -t jokerarena-frontend .

# Ejecutar el contenedor en el puerto 3000
docker run -d --name jokerarena-fe -p 3000:80 jokerarena-frontend
```

La interfaz web estará accesible en `http://localhost:3000`.

---

## 🔗 Integración con Backend

Este frontend interactúa con los microservicios del ecosistema Joker Arena:
- **Game Engine (Go)**: `http://localhost:8080` (REST & WebSockets)
- **Telemetry & Analytics (Python)**: `http://localhost:8000` (REST API & Métricas)

Para el despliegue del ecosistema completo de microservicios, consulta el repositorio:
👉 [Joker Arena Backend](https://github.com/AngelDavidRuizB/joker-arena-backend)

---

## 📄 Licencia

Este proyecto está desarrollado bajo fines académicos para la asignatura de Arquitectura de Software.
