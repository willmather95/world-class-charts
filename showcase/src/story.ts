// Turns energy.json into chart props and the numbers in the copy. No figure on the page is typed
// by hand. data/build_data.py asserts the worded claims (fell, lowest, first time).
import energy from "./energy.json";

export const { meta, world, coal, renew, renewYears, table } = energy;
export type Year = (typeof world)[number];

export const solarWind = (r: Year) => r.solar + r.wind;
export const prev = world[world.length - 2];
export const last = world[world.length - 1];
export const first = world[0];
export const at = (year: number) => world.find((r) => r.year === year) as Year;
export const share = (part: number, r: Year) => part / r.total;

const otherClean = (r: Year) => r.hydro + r.bioenergy + r.other;
const diff = (f: (r: Year) => number) => f(last) - f(prev);

export const growth = diff((r) => r.total);
export const solarWindGrowth = diff(solarWind);

export const steps = [
  { label: "Solar", value: diff((r) => r.solar) },
  { label: "Wind", value: diff((r) => r.wind) },
  { label: "Gas", value: diff((r) => r.gas) },
  { label: "Nuclear", value: diff((r) => r.nuclear) },
  { label: "Hydro and other", value: diff(otherClean) },
  { label: "Oil", value: diff((r) => r.oil) },
  { label: "Coal", value: diff((r) => r.coal) },
];

export const mixSeries = [
  { key: "sw", label: "Solar and wind" },
  { key: "clean", label: "Hydro and other" },
  { key: "nuclear", label: "Nuclear" },
  { key: "gasoil", label: "Gas and oil" },
  { key: "coal", label: "Coal" },
];
export const mix = [2000, 2005, 2010, 2015, 2020, 2025].map(at).map((r) => ({
  label: String(r.year),
  values: [solarWind(r), otherClean(r), r.nuclear, r.gas + r.oil, r.coal],
}));

export const yearDate = (y: number) => new Date(y, 6, 1);
export const trend = world.map((r) => ({ date: yearDate(r.year), value: solarWind(r), compare: r.coal }));
export const coalHigh = world.reduce((a, b) => (b.coal > a.coal ? b : a));
export const coalHighIndex = world.indexOf(coalHigh);
