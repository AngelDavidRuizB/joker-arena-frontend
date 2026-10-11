# ==============================================================================
# Stage 1: Build React + Vite SPA
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# Install dependencies (resilient to presence/absence of package-lock.json)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy frontend source files, configuration, and assets
COPY . .

# Compile optimized static bundle into /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Production Nginx Web Server & Reverse Proxy
# ==============================================================================
FROM nginx:1.27-alpine

# Remove default boilerplate configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy production static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with reverse proxy and SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose internal HTTP port
EXPOSE 80

# Launch Nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
