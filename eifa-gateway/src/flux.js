import axios from "axios";
import { tryCount } from "./tryCount.js";
import { notOr } from "./helpers.js";

const FLUX_LOCATION_BASE_URL = "https://api.runonflux.io/apps/location";

function getServers(appName) {
  return tryCount(async () => {
    const {
      data: { data },
    } = await axios(`${FLUX_LOCATION_BASE_URL}/${appName}`);
    return data
      .map((raw) => {
        const { ip, expireAt } = raw ?? {};

        // normalize ip
        const normalizeIp = String(ip || "").split(":")?.[0];
        if (!normalizeIp) return null;

        // transform expireAt
        const transformedExp = expireAt
          ? new Date(expireAt)
          : new Date(Date.now() + 24 * 60 * 60 * 1000);

        return { ip: normalizeIp, exp: transformedExp };
      })
      .filter((d) => d);
  }, 10);
}

async function getServerResponseTime({ ip, port, count = 5, max = 300_000 }) {
  const response_times = [];
  for (let i = 0; i < count; i++) {
    try {
      const start = Date.now();
      console.log(`curl to http://${ip}:${port}`);
      await axios.get(`http://${ip}:${port}`, { timeout: max });
      const end = Date.now();
      response_times.push(end - start);
    } catch (err) {
      response_times.push(max);
    }
  }

  const sum = response_times.reduce((prev, curr) => curr + prev, 0);
  return Math.ceil(sum / response_times.length);
}

function calcMinExp(servers, min, max) {
  const anotherMin = servers.reduce((minExp, server) => {
    // expire at
    if (notOr(minExp, minExp?.getTime() > server.exp.getTime()))
      minExp = server.exp;

    return minExp;
  }, null);

  if (!anotherMin || anotherMin.getTime() > max.getTime()) return max;
  if (anotherMin.getTime() < max.getTime()) return min;

  return anotherMin;
}

export async function getFluxStatus() {
  const servers = await getServers(process.env.FLUX_APP_NAME);
  const minPeriod = +process.env.MIN_LENGTH_OF_PERIOD || 1800;
  const maxPeriod = +process.env.MAX_LENGTH_OF_PERIOD || 10800;
  const minExpThreshold = new Date(Date.now() + minPeriod * 1000);
  const maxExpThreshold = new Date(Date.now() + maxPeriod * 1000);
  const exp = calcMinExp(servers, minExpThreshold, maxExpThreshold);

  for (const server of servers) {
    const response_time = await getServerResponseTime({
      ip: server.ip,
      port: process.env.FLUX_APP_PORT,
      count: +process.env.REQ_COUNT || 5,
      max: +process.env.REQ_TIMEOUT || 300_000,
    });
    server.response_time = response_time;
  }
  return { servers, exp };
}
