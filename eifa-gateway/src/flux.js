import axios from "axios";
import { tryCount } from "./tryCount.js";
import { notOr } from "./helpers.js";

export function getFluxStatus() {
  return tryCount(async () => {
    const {
      data: { data },
    } = await axios(process.env.FLUX_API_URL);
    return data.reduce(
      (acc, curr) => {
        // ip
        acc.ips.push((curr.ip ?? "").split(":")[0]);

        curr.expireAt = new Date(curr.expireAt);

        // expire at
        if (
          notOr(acc.expireAt, acc.expireAt?.getTime() > curr.expireAt.getTime())
        )
          acc.expireAt = curr.expireAt;

        return acc;
      },
      { ips: [], expireAt: null }
    );
  }, 10);
}
