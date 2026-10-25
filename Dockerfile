FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/jev ./jev
COPY --from=build /app/data/taxonomy.json ./data/taxonomy.json
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "server/index.mjs"]
