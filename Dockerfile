# Stage 1: Build React Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Copy server package files and install production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server source and database schema
COPY server/ ./server/
COPY database/ ./database/

# Copy compiled frontend from Stage 1 into client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port (default 5000)
ENV PORT=5000
EXPOSE 5000

# Start Express + Socket.io Server
CMD ["node", "server/src/server.js"]
