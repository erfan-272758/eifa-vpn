FROM ubuntu:22.04
RUN apt update -y && apt install -y openssh-server vim curl nginx tinyproxy
RUN useradd -rm -d /home/eifa -s /bin/bash -g root -G sudo -u 1000 eifa
RUN mkdir -p /home/eifa/.ssh
RUN mkdir -p /root/.ssh
COPY public_key /home/eifa/.ssh/authorized_keys
COPY public_key /root/.ssh/authorized_keys
RUN echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
RUN mkdir /var/run/sshd
EXPOSE 22 80 8080 8081 8082 8083 8084 8085
COPY ./proxy-server /usr/local/bin/
COPY ./docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT [ "/usr/local/bin/docker-entrypoint.sh" ]
