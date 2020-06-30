FROM node:12
WORKDIR /app
COPY . .
ENV SESSION_STORE_URL=redis
RUN npm install -g @angular/cli
RUN npm i
RUN npm run build 
USER root
RUN chmod +x dist/worker/mediasoup-worker
USER node


FROM node:12
WORKDIR /app
RUN chown -R node /app
USER node
ENV NODE_ENV=production
RUN mkdir dist
COPY --from=0 /app/dist /app/dist 
COPY .env.example .env 
ENV SESSION_STORE=redis
ENV SESSION_STORE_URL=redis
ENV MEDIASOUP_WORKER_BIN=dist/worker/mediasoup-worker 
ENV LOGFILE=
CMD node dist/server.js
EXPOSE 4000

