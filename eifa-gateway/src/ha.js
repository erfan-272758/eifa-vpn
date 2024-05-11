import fs from "fs";
import { lcm } from "mathjs";
import exec from "./exec.js";

const default_cfg = `
global
    stats socket /var/lib/haproxy/stats
    pidfile /var/run/haproxy.pid
    log 127.0.0.1 local2
    chroot /var/lib/haproxy
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    tcp
    option  httplog
    option  dontlognull
    retries                 10
    timeout http-request    5m
    timeout queue           5m
    timeout connect         5m
    timeout client          5m
    timeout server          5m
    timeout http-keep-alive 5m
    timeout check           5m
    maxconn                 30000 
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
backend my_backend
  balance     roundrobin`;
    for (const [i, server] of this.servers.entries()) {
      backend_cfg += `
    server backend${i} ${server.ip}:${process.env.HA_BACKEND_PORT} weight ${server.weight}
`;
    }

    console.log("[HA] new backend\n", backend_cfg);
    cfg += backend_cfg;

    cfg.trimEnd();
    if (cfg[cfg.length - 1] !== "\n") cfg += "\n";

    // write
    // backup
    if (fs.existsSync("/etc/haproxy/haproxy.cfg"))
      await fs.promises.cp(
        "/etc/haproxy/haproxy.cfg",
        "/etc/haproxy/haproxy.cfg.bk"
      );

    await fs.promises.writeFile("/etc/haproxy/haproxy.cfg", cfg, "utf8");
  }
  async reloadHA() {
    await exec(
      "haproxy -f /etc/haproxy/haproxy.cfg -sf $(cat /var/run/haproxy.pid)"
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
