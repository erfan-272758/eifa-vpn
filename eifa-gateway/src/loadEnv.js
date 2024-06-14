import fs from "fs";
import { config } from "dotenv";

if (fs.existsSync("./.env.local"))
  config({
    path: ".env.local",
  });

export function getEnv(key = "") {
  return process.env[key.toUpperCase().replace(/[- ]/g, "_")];
}
