FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; \
    else npm install --omit=dev; fi

COPY src ./src
COPY sql ./sql

ENV NODE_ENV=production
EXPOSE 4100

# Run migrations then start the server
CMD sh -c "node src/migrate.js && node src/server.js"
