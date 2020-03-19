FROM node:12 as base

COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
RUN cd /app && npm ci

FROM node:12-alpine
EXPOSE 5000
WORKDIR /app

COPY ./dist /app/dist
COPY --from=base /app/node_modules /app/node_modules

ENTRYPOINT [ "node", "dist/main.js" ]
