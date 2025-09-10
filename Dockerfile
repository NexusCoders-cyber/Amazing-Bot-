FROM node:18-alpine

LABEL maintainer="Ilom <contact@ilom.tech>"
LABEL version="1.0.0"
LABEL description="🧠 Amazing Bot 🧠 v1 created by Ilom - Advanced WhatsApp Bot"

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    ffmpeg \
    imagemagick \
    && rm -rf /var/cache/apk/*

COPY package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

COPY . .

RUN mkdir -p logs temp session media backups && \
    chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENV NODE_ENV=production
ENV PORT=3000

VOLUME ["/app/logs", "/app/session", "/app/media", "/app/backups"]

CMD ["npm", "start"]