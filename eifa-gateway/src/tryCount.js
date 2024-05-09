import { setTimeout } from "timers/promises";

export async function tryCount(fn, count) {
  let c = 0,
    error = null;
  while (c < count) {
    try {
      return await fn();
    } catch (err) {
      error = err;
    }
    await setTimeout(1000);
    c++;
  }
  throw error;
}
