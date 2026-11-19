export type Clock = () => number;
export const systemClock: Clock = () => Date.now();

/** UTC calendar day (YYYY-MM-DD): the unit for budgets and analytics. */
export const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
