# 任意のホスト（Railway / Fly.io / Render Docker 等）で使える汎用 Dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV ALLOW_ADMIN=false
EXPOSE 4000
CMD ["node", "dist/main.js"]
