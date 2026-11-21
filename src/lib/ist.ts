/** Indian Standard Time helpers. The forecast and every "now" in the interface are in IST, wherever the visitor's device is. */

const IST = "Asia/Kolkata";

/** The current hour of the day in India (0-23). */
export const istHour = (): number =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: IST }).format(new Date()));

/** "14:05": a moment (epoch milliseconds) as a 24-hour clock time in India, for "updated at" labels. */
export const istClock = (epochMs: number): string =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: IST }).format(new Date(epochMs));
