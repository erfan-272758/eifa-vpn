import { Telegraf } from "telegraf";
import { getEnv } from "./loadEnv.js";
import { tryCount } from "./tryCount.js";
import { HttpsProxyAgent } from "https-proxy-agent";

export async function sendTelNotif(msg) {
  const telbotToken = getEnv("telbot-token");
  const telbotChannel = getEnv("telbot-channel");
  const telbotHttpsProxy = getEnv("telbot-https-proxy");

  if (!telbotToken || !telbotChannel)
    return console.log("[telbot] not set configs correctly", {
      telbotChannel,
      telbotToken,
    });

  let agent;
  if (telbotHttpsProxy) agent = new HttpsProxyAgent(telbotHttpsProxy);

  await tryCount(async () => {
    console.log("in try catch bot", { msg, agent });
    const bot = new Telegraf(telbotToken, {
      //   telegram: { agent },
    });
    await bot.telegram.sendMessage(telbotChannel, msg, { parse_mode: "HTML" });
  }, 1);
}
