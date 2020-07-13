FROM node:12 as base
WORKDIR /app

COPY ./package*.json /app/
RUN npm ci

FROM node:12-alpine
WORKDIR /app
EXPOSE 5000

COPY ./src/ ./tsconfig.json ./package*.json /app/
COPY --from=base /app/node_modules /app/

ENTRYPOINT ["npx", "ts-node", "src/main.ts"]
