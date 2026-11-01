import { useEffect, useState, type ReactNode } from "react";
import { ChartPrefs, KpiSparkCard, SlopeChart, SmallMultiples, SparkTable, StackedBars, TrendAreaChart, Waterfall, fmt, fmtPercent } from "../../src";
import {
  coal, coalHigh, coalHighIndex, first, growth, last, meta, mix, mixSeries, prev, renew, renewYears, share, solarWind,
  solarWindGrowth, steps, table, trend, world, yearDate,
} from "./story";

const REPO = "https://github.com/willmather95/world-class-charts";
const SOURCE = "Source: Ember (2026); Our World in Data.";
const twh = (v: number) => `${fmt(v, "number", { compact: false, decimals: 0 })} TWh`;
const pct = (v: number) => fmtPercent(v, 1);
const row = (label: string) => coal.find((r) => r.label === label) as (typeof coal)[number];
const lead = renew[0];
const rose = coal.filter((r) => r.to > r.from);
const step = (label: string) => steps.find((s) => s.label === label)?.value ?? 0;
const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];

function useTheme() {
  const [dark, setDark] = useState(() => {
    const asked = new URLSearchParams(location.search).get("theme");
    if (asked) return asked === "dark";
    try { const saved = localStorage.getItem("showcase.theme"); if (saved) return saved === "dark"; } catch { /* private mode */ }
    return matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    try { localStorage.setItem("showcase.theme", dark ? "dark" : "light"); } catch { /* private mode */ }
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="mt-14 md:mt-20">
      <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] md:text-[30px]">{title}</h2>
      <p className="mt-2 mb-6 max-w-[62ch] text-[16px] leading-relaxed text-wc-ink-2">{text}</p>
      {children}
    </section>
  );
}

const link = "underline underline-offset-2 hover:text-wc-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wc-focus";

export function App() {
  const [dark, flip] = useTheme();
  return (
    <main className="mx-auto max-w-[1120px] px-4 pt-6 pb-16 md:px-8 md:pt-8">
      <nav className="flex flex-wrap items-center justify-between gap-3 text-[13px]" aria-label="Page">
        <a href={REPO} className={`font-medium ${link}`}>world-class-charts</a>
        <div className="flex flex-wrap items-center gap-2">
          <ChartPrefs />
          <button type="button" onClick={flip} className="min-h-6 rounded-full px-3 py-1 text-[12px] font-medium text-wc-muted ring-1 ring-wc-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wc-focus">
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </nav>

      <header className="mt-12 max-w-[820px] md:mt-20">
        <p className="text-[14px] font-medium text-wc-muted">World electricity, {meta.firstYear} to {meta.lastYear}</p>
        <h1 className="mt-3 text-[38px] font-semibold leading-[1.06] tracking-[-0.03em] md:text-[60px]">
          In {meta.lastYear}, solar and wind supplied almost all of the world's new electricity
        </h1>
        <p className="mt-5 max-w-[62ch] text-[18px] leading-relaxed text-wc-ink-2">
          Generation grew by {twh(growth)}. Solar and wind added {twh(solarWindGrowth)}. Coal fell, yet it still makes {fmt(last.coal / solarWind(last), "number", { decimals: 1 })} times as much power as the two combined.
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <KpiSparkCard title="Solar and wind share" value={share(solarWind(last), last)} kind="percent" note={`${pct(share(solarWind(prev), prev))} in ${prev.year}`} series={world.map((r) => share(solarWind(r), r))} source={SOURCE} />
        <KpiSparkCard title="Coal share" value={share(last.coal, last)} kind="percent" note={`${pct(share(prev.coal, prev))} in ${prev.year}`} series={world.map((r) => share(r.coal, r))} source={SOURCE} />
        <KpiSparkCard title="Low-carbon share" value={last.lowCarbon} kind="percent" note={`${pct(prev.lowCarbon)} in ${prev.year}`} series={world.map((r) => r.lowCarbon)} source={SOURCE} />
      </div>

      <Section title="Nearly all the growth came from two sources" text={`Solar alone covered ${pct(step("Solar") / growth)} of the rise. Solar and wind together covered ${pct(solarWindGrowth / growth)}. Green bars add generation and red bars remove it, so coal's red bar is a fall in coal, not a bad result.`}>
        <Waterfall
          title="Change in world generation, TWh" subtitle={`Solar added ${twh(step("Solar"))} and wind ${twh(step("Wind"))}. Coal lost ${twh(-step("Coal"))}.`}
          start={{ label: `${prev.year}`, value: 0 }} steps={steps} endLabel={`${last.year}`} source={`${SOURCE} ${prev.year} is the zero line.`} height={300}
        />
      </Section>

      <Section title="The mix moved slowly, then quickly" text={`Solar overtook wind in ${last.year}. Coal's share is the lowest since at least ${meta.firstYear}, but it is still the largest single source.`}>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <StackedBars title="World electricity mix" subtitle={`Solar and wind rose from ${pct(share(solarWind(first), first))} to ${pct(share(solarWind(last), last))}. Coal slipped from ${pct(share(first.coal, first))} to ${pct(share(last.coal, last))}.`} series={mixSeries} data={mix} mode="percent" height={300} source={SOURCE} />
          <TrendAreaChart title="Solar and wind vs coal, TWh" subtitle={`Coal hit ${twh(coalHigh.coal)} in ${coalHigh.year}, then dipped. One fall does not prove a peak.`} data={trend} grain="year" valueLabel="Solar and wind" compareLabel="Coal" annotations={[{ index: coalHighIndex, text: `${coalHigh.year} high` }]} height={300} source={SOURCE} />
        </div>
      </Section>

      <Section title="Countries are moving at different speeds" text="Falling coal shares and rising solar and wind shares show up across rich and developing countries alike. The pace is uneven, and in some places coal is still growing.">
        <div className="grid gap-4">
          <SlopeChart title="Coal's share of generation" subtitle={`${words[coal.length - rose.length]} of these ${words[coal.length].toLowerCase()} cut coal's share. The UK reached ${pct(row("UK").to)}. ${rose[0].label} rose to ${pct(rose[0].to)}.`} data={coal} fromLabel="2015" toLabel={`${meta.lastYear}`} kind="percent" polarity="down-good" highlight={["UK", rose[0].label]} source={SOURCE} />
          <SmallMultiples title="Solar and wind share of generation" subtitle={`${lead.label} leads this group at ${pct(lead.values[lead.values.length - 1])}, up from ${pct(lead.values[0])} in ${renewYears[0]}.`} dates={renewYears.map(yearDate)} series={renew} grain="year" kind="percent" source={SOURCE} />
          <SparkTable title="Solar and wind at the ten largest producers" subtitle={`${table[0].label} made ${twh(table[0].series[table[0].series.length - 1])}, ${pct(table[0].series[table[0].series.length - 1] / solarWind(last))} of the world total.`} rows={table.map((t) => ({ label: t.label, value: t.series[t.series.length - 1], previous: t.series[0], series: t.series, sublabel: `${twh(t.generation)} generated` }))} valueLabel={`${meta.lastYear}, TWh`} trendLabel={`${renewYears[0]} to ${meta.lastYear}`} showShare={false} source={`${SOURCE} Change is since ${renewYears[0]}.`} />
        </div>
      </Section>

      <footer className="mt-16 border-t border-wc-hairline pt-6 text-[14px] leading-relaxed text-wc-ink-2 md:mt-24">
        <h2 className="text-[16px] font-semibold text-wc-ink">About this page</h2>
        <p className="mt-2 max-w-[70ch]">
          Every chart uses <a className={link} href={REPO}>world-class-charts</a>, 18 MIT-licensed React components that draw plain SVG and HTML, with no chart library. Each one has a keyboard path and a data table. Try the arrow keys on any chart.
        </p>
        <p className="mt-3 max-w-[70ch]">
          Data: Ember, <a className={link} href="https://ember-energy.org/data/yearly-electricity-data/">Yearly Electricity Data</a> (2026), CC BY 4.0, with processing by Hannah Ritchie, Pablo Rosado and Max Roser, <a className={link} href="https://ourworldindata.org/energy">Our World in Data</a>, CC BY 4.0. Retrieved {meta.retrieved}. <a className={link} href={`${REPO}/tree/main/showcase/data`}>Rebuild the data</a>.
        </p>
      </footer>
    </main>
  );
}
