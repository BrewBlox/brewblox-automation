FROM node:12-slim
WORKDIR /app
EXPOSE 5000

COPY ./tsconfig.json ./package*.json /app/
COPY ./src /app/src
RUN npm ci && ls /app && ls /app/src

ENTRYPOINT ["npx", "ts-node", "src/main.ts"]
