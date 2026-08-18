# Build stage - Backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Build stage - Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install nginx para servir frontend
RUN apk add --no-cache nginx

# Copy backend
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/src ./backend/src
COPY backend/dist ./backend/dist 2>/dev/null || true
COPY backend/package.json ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start both nginx and backend
CMD ["sh", "-c", "nginx -g 'daemon off;' & cd backend && npm start"]
