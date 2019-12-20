FROM brewblox/rpi-node:12 as base

COPY ./package.json /app/package.json
RUN cd /app && npm install

FROM brewblox/rpi-node:12-alpine
EXPOSE 5000
WORKDIR /app

COPY ./dist /app/dist
COPY --from=base /app/node_modules /app/node_modules

ENTRYPOINT [ "node", "dist/server.js" ]
