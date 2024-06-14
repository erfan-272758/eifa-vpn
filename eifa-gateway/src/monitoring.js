import { getEnv } from "./loadEnv.js";
import { sendTelNotif } from "./tel.js";

export default class Monitoring {
  constructor(servers) {
    this.servers = servers;
  }

  alert() {
    try {
      console.log("alert call");
      //   check threshold
      let responseTimeWaterMark = getEnv("response_time_water_mark");
      let serverTimeoutCount = getEnv("server_timeout_count");

      //   monitoring not set
      if (
        responseTimeWaterMark === undefined ||
        serverTimeoutCount === undefined
      ) {
        console.log("configs not found", {
          responseTimeWaterMark,
          serverTimeoutCount,
        });
        return;
      }

      responseTimeWaterMark = +responseTimeWaterMark;
      serverTimeoutCount = +serverTimeoutCount;

      const fireServers = this.servers.filter(
        (server) => server.response_time >= responseTimeWaterMark
      );
      if (fireServers.length < serverTimeoutCount) return;

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
      console.log("bot call");
      sendTelNotif(msgs.join("\n")).catch((err) =>
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
