# --- STAGE 1: COMPILATION BUILD ENVIRONMENT ---
FROM node:20-alpine AS build_engine

WORKDIR /app

# Optimize caching strategies by splitting dependency tracking layers
COPY package.json ./

RUN npm install

# Load all core application source code layouts
COPY . .

# Build the app. Outputs clean web code inside the /dist folder
RUN npm run build

# --- STAGE 2: PRODUCTION DEPLOYMENT ENGINE ---
FROM nginx:alpine AS production_runtime

# Pull the compiled assets from the build container into Nginx standard html folder
COPY --from=build_engine /app/dist /usr/share/nginx/html

# Expose Nginx default production port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]