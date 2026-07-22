FROM node:20-alpine

ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Build the app (if applicable)
RUN npm run build 2>/dev/null || true

# Create non-root user
RUN addgroup -g 1000 node && \
    adduser -D -u 1000 -G node node && \
    chown -R node:node /app

USER node

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5173', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
