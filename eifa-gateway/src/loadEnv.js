import fs from "fs";
import { config } from "dotenv";

if (fs.existsSync("./.env.local"))
  config({
    path: ".env.local",
  });
