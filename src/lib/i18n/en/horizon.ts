/** The 24-hour horizon chart and the impact bar. */
export const horizon = {
  // ---- 24-hour horizon
  horizonTitle: "Scrub 24-hour atmospheric horizon",
  jumpTo: (h: string) => `Jump to ${h} safe window`,
  pause: "Pause sky",
  play: "Play 24h sky",
  chartTitle: "24-hour outdoor and indoor PM2.5",
  chartDesc: ({ start, end, mean, time, out, inn }: { start: string; end: string; mean: number; time: string; out: number; inn: number }) =>
    `Solid line: outdoor PM2.5. Dashed line: modelled indoor PM2.5. Lowest 90-minute window ${start} to ${end} at ${mean} micrograms per cubic metre. Selected hour ${time}: outdoor ${out}, indoor ${inn}.`,
  hourOfDay: "Hour of day",
  valueText: (time: string, out: number, inn: number) => `${time}, outdoor PM2.5 ${out} micrograms per cubic metre, indoor ${inn}`,
  legendOutdoor: "Outdoor PM2.5",
  legendIndoor: "Sanctuary room, modelled",
  legendWindow: "Low-smog window",
  viewTable: "View hourly values as a table",
  tableCaption: "Hourly outdoor PM2.5, AQI and modelled indoor PM2.5",
  thHour: "Hour",
  thOutdoor: "Outdoor µg/m³",
  thAqi: "AQI",
  thIndoor: "Indoor µg/m³",

  // ---- impact bar
  impactAria: "Today's impact",
  impactLabel: "Your impact",
  impactEmpty: "Turn on a routine shift or pick a filter to see what it saves.",
  lungsProtected: "Lungs protected",
  cigEqTitle: "cigarette-equivalents",
  cigEqPerDay: "cig-eq",
  perDay: "/day",
  skyProtected: "Sky protected",
  co2PerDay: "g CO₂/day",
  receiptShort: "Receipt",
};
