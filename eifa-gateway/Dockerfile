FROM node:20.13.1-bullseye
RUN apt update -y && apt install -y haproxy
RUN touch /var/run/haproxy.pid
WORKDIR /app
COPY ./package* /app/
RUN npm ci
COPY . .
COPY ./docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT [ "/usr/local/bin/docker-entrypoint.sh" ]
