FROM node:12-slim
WORKDIR /app
EXPOSE 5000

COPY ./tsconfig.json ./package*.json /app/
COPY ./src /app/src
RUN npm ci && npm run build

ENTRYPOINT ["npm", "start"]
