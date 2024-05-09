import fs from "fs";
import { lcm } from "mathjs";
import exec from "./exec.js";

const default_cfg = `
global
        log /dev/log    local0
        log /dev/log    local1 notice
        chroot /var/lib/haproxy
        stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
        stats timeout 30s
        user haproxy
        group haproxy
        daemon

        # Default SSL material locations
        ca-base /etc/ssl/certs
        crt-base /etc/ssl/private

        # See: https://ssl-config.mozilla.org/#server=haproxy&server-version=2.0.3&config=intermediate
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
        log     global
        mode    http
        option  httplog
        option  dontlognull
        timeout connect 5000
        timeout client  50000
        timeout server  50000
        errorfile 400 /etc/haproxy/errors/400.http
        errorfile 403 /etc/haproxy/errors/403.http
        errorfile 408 /etc/haproxy/errors/408.http
        errorfile 500 /etc/haproxy/errors/500.http
        errorfile 502 /etc/haproxy/errors/502.http
        errorfile 503 /etc/haproxy/errors/503.http
        errorfile 504 /etc/haproxy/errors/504.http
`;

export default class HA {
  constructor(servers) {
    this.servers = servers;
  }
  effectWeights() {
    const finalLcm = lcm(...this.servers.map((s) => s.response_time));
    let biggestWeight = 0;
    for (const server of this.servers) {
      server.weight = finalLcm / server.response_time;
      if (biggestWeight < server.weight) biggestWeight = server.weight;
    }
    const tValue = 255 / biggestWeight;
    for (const server of this.servers) {
      server.weight = Math.ceil(server.weight * tValue);
    }
  }
  async writeNewConfig() {
    let cfg = default_cfg;

    // add front
    cfg += `
frontend my_frontend
    bind *:${process.env.HA_FRONT_PORT ?? "8080"}
    default_backend my_backend
    `;

    // backend
    let backend_cfg = `
backend my_backend`;
    for (const [i, server] of this.servers.entries()) {
      backend_cfg += `
    server backend${i} ${server.ip}:${process.env.HA_BACKEND_PORT} weight ${server.weight}
    `;
    }

    console.log("[HA] new backend\n", backend_cfg);
    cfg += backend_cfg;

    // write
    await fs.promises.cp(
      "/etc/haproxy/haproxy.cfg",
      "/etc/haproxy/haproxy.cfg.bk"
    );
    await fs.promises.writeFile("/etc/haproxy/haproxy.cfg", cfg, "utf8");
  }
  async reloadHA() {
    await exec(
      "haproxy -f /path/to/haproxy.cfg -p /var/run/haproxy.pid -sf $(cat /var/run/haproxy.pid)"
    );
  }

  async reConfigHA() {
    // weight
    this.effectWeights();

    // write config
    await this.writeNewConfig();

    // reload
    await this.reloadHA();
  }
}
