import "./src/loadEnv.js";
import Cloudflare from "./src/cf.js";
import { getFluxStatus } from "./src/flux.js";
import { tryCount } from "./src/tryCount.js";

const cf = new Cloudflare();

async function main() {
  console.log("call at", new Date());

  const { ips, expireAt } = await getFluxStatus();

  console.log({ ips, expireAt });

  const domain = process.env.CF_DOMAIN;
  const sub = process.env.CF_SUBDOMAIN ?? "ssh";

  const cfIps = (await cf.getRecords(domain))
    .filter((d) => d.type === "A" && d.name === `${sub}.${domain}`)
    .map((d) => d.content);

  const addIps = ips.filter((ip) => !cfIps.includes(ip));
  const rmIps = cfIps.filter((ip) => !ips.includes(ip));

  console.log({ addIps, rmIps });

  try {
    // add into cloudflare
    await Promise.all(
      addIps.map((ip) =>
        tryCount(
          async () =>
            await cf.addRecord(domain, {
              content: ip,
              isProxy: false,
              name: sub,
              type: "A",
            }),
          10
        )
      )
    );
    console.log("after add");
  } catch (err) {
    console.log("add error", err);
    throw err;
  }

  try {
    // rm into cloudflare
    await Promise.all(
      rmIps.map((ip) =>
        tryCount(
          () =>
            cf.removeRecord(domain, {
              name: sub,
              type: "A",
              content: ip,
            }),
          10
        )
      )
    );
    console.log("after remove");
  } catch (err) {
    console.log("remove error", err);
    throw err;
  }

  setTimeout(
    main,
    Math.max(5 * 60 * 1000, expireAt.getTime() - Date.now() + 1000)
  );
}

main();
