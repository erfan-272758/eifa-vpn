import "./src/loadEnv.js";
import { getFluxStatus } from "./src/flux.js";
import HA from "./src/ha.js";
import Monitoring from "./src/monitoring.js";

async function main() {
  console.log("call at", new Date());

  let exp = new Date();

  try {
    const fluxStatus = await getFluxStatus();
    const servers = fluxStatus.servers;
    exp = fluxStatus.exp;
    console.log({ servers, exp });
    const ha = new HA(servers);
    await ha.reConfigHA();

    // alert
    const monitoring = new Monitoring(servers);
    monitoring.alert();
  } catch (err) {
    console.error("[main]", err);
  }

  setTimeout(main, Math.max(5 * 1000, exp.getTime() - Date.now()));
}

main();
