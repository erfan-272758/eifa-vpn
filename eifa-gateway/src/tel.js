import axios from "axios";
import { getEnv } from "./loadEnv.js";
import { tryCount } from "./tryCount.js";

export async function sendTelNotif(msg, servers) {
  const telbotToken = getEnv("telbot-token");
  const telbotChannel = getEnv("telbot-channel");
  const serverProxyBasicAuthHeader = getEnv("SERVER_PROXY_BASIC_AUTH");

  if (!telbotToken || !telbotChannel || !serverProxyBasicAuthHeader)
    return console.log("[telbot] not set configs correctly", {
      telbotChannel,
      telbotToken,
      serverProxyBasicAuthHeader,
    });

  const fastestServer = servers.reduce((curr, prev) => {
    if (!prev || prev.response_time > curr.response_time) return curr;
    return prev;
  }, null);

  await tryCount(async () => {
    const data = {
      url: `https://api.telegram.org/bot${telbotToken}/sendMessage`,
      method: "POST",
      body: {
        chat_id: telbotChannel,
        text: msg,
        parse_mode: "HTML",
      },
    };

    const config = {
      method: "get",
      url: `http://${fastestServer.ip}:32001/proxy`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${serverProxyBasicAuthHeader}`,
      },
      data: data,
    };

    await axios(config);
  }, 5);
}
