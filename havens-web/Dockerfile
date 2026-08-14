FROM node:20-alpine

WORKDIR /app

# Build-time argument for the Google Maps key (used by `vite build`)
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies like vite)
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
