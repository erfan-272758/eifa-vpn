#!/bin/bash
set -e

# run haproxy
haproxy -f /etc/haproxy/haproxy.cfg -p /var/run/haproxy.pid

# run watcher
node index