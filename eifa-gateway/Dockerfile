FROM node:20.13.1-bullseye
RUN apt update -y && apt install -y haproxy
RUN mkdir /var/run/haproxy
RUN touch /var/haproxy.pid
WORKDIR /app
COPY ./package* /app/
RUN npm ci
COPY . .
CMD [ "index" ]
