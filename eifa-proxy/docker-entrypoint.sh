#!/bin/bash
set -e


/usr/sbin/nginx -g "daemon off;" &

IFS=',' read -ra IPS <<< "$ALLOW_IP"
ALLOW=""
for IP in "${IPS[@]}"
do
    ALLOW+="ALLOW $IP"$'\n'
done


cat > /etc/tinyproxy/tinyproxy.conf <<EOF
User root
Group root
Port 8080
Timeout 600
DefaultErrorFile "/usr/share/tinyproxy/default.html"
StatFile "/usr/share/tinyproxy/stats.html"
LogFile "/var/log/tinyproxy/tinyproxy.log"
LogLevel Info
PidFile "/run/tinyproxy/tinyproxy.pid"
MaxClients 100
Allow 127.0.0.1
Allow ::1
$ALLOW
ViaProxyName "tinyproxy"
ConnectPort 443
ConnectPort 563
EOF

/etc/init.d/tinyproxy restart

/usr/sbin/sshd -D 