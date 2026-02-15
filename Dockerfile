FROM node:20-slim

RUN apt-get update -qq && apt-get install -y -qq python3 make g++ curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
