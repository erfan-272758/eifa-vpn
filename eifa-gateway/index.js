import "./src/loadEnv.js";
import { getFluxStatus } from "./src/flux.js";
import HA from "./src/ha.js";

async function main() {
  console.log("call at", new Date());

  try {
    const { servers, expr } = await getFluxStatus();
    console.log({ servers, expr });
    const ha = new HA(servers);
    await ha.reConfigHA();
  } catch (err) {
    console.error("[main]", err);
  }

  setTimeout(main, Math.max(5 * 1000, expr.getTime() - Date.now()));
}

main();
