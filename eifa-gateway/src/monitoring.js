import { getEnv } from "./loadEnv.js";
import { sendTelNotif } from "./tel.js";

export default class Monitoring {
  constructor(servers) {
    this.servers = servers;
  }

  alert() {
    try {
      //   check threshold
      let responseTimeWaterMark = getEnv("response_time_water_mark");
      let serverTimeoutCount = getEnv("server_timeout_count");

      //   monitoring not set
      if (
        responseTimeWaterMark === undefined ||
        serverTimeoutCount === undefined
      ) {
        return;
      }

      responseTimeWaterMark = +responseTimeWaterMark;
      serverTimeoutCount = +serverTimeoutCount;

      const fireServers = this.servers.filter(
        (server) => server.response_time >= responseTimeWaterMark
      );
      if (fireServers.length <= serverTimeoutCount) return;

      const msgs = [];

      // tile
      msgs.push(`<b>Server Timeout</b>`);

      // name
      msgs.push(`name: ${getEnv("FLUX_APP_NAME")}`);

      //   servers
      msgs.push("<b>servers:</b>");
      msgs.push(
        ...fireServers.map((s) => `  ip: ${s.ip}, rt: ${s.response_time}ms`)
      );

      // send
      sendTelNotif(msgs.join("\n"), this.servers).catch((err) =>
        console.error(
          `[${new Date().toISOString()}] [monitoring] [telbot]`,
          err
        )
      );
    } catch (err) {
      console.error("[monitoring]", err);
    }
  }
}
