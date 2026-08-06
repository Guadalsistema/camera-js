FROM node:22-alpine
WORKDIR /app
COPY . .
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["node", "examples/server.js"]
