import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import {
  TrendAreaChart, PairedBars, StackedBars, DeltaBars, GoalProgress, BudgetCard, CategoryBreakdown,
  RadialBars, CalendarHeatmap, SparkTable, KpiSparkCard, StatStrip, SankeyFlow, RangeBars,
  SmallMultiples, BulletChart, Waterfall, SlopeChart, ChartPrefs, ShareState,
} from "./templates";

// Deterministic sample data so screenshots are stable.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const trend = months.map((_, i) => ({ date: new Date(2026, i, 1), value: Math.round(4200 + i * 520 + Math.sin(i) * 600), compare: Math.round(3600 + i * 380 + Math.cos(i) * 400) }));
const paired = months.slice(0, 8).map((m, i) => ({ label: m, a: Math.round(2400 + rnd() * 1600), b: Math.round(1600 + rnd() * 1800 + (i === 5 ? 900 : 0)) }));
const stacked = months.slice(3, 10).map((m) => ({ label: m, values: [Math.round(300 + rnd() * 200), Math.round(160 + rnd() * 140), Math.round(80 + rnd() * 90), Math.round(30 + rnd() * 50)] }));
const series = [{ key: "search", label: "Search" }, { key: "direct", label: "Direct" }, { key: "social", label: "Social" }, { key: "email", label: "Email" }];
const days = Array.from({ length: 26 * 7 }, (_, i) => {
  const d = new Date(2026, 4, 4 + i);
  const wk = d.getDay() === 0 || d.getDay() === 6;
  return { date: d, value: i % 41 === 17 ? null : Math.max(0, Math.round((wk ? 2 : 9) * rnd() * (1 + i / 120))) };
});
const flowNodes = [
  { id: "income", label: "Income" }, { id: "home", label: "Home" }, { id: "living", label: "Living" }, { id: "save", label: "Savings" },
  { id: "rent", label: "Rent" }, { id: "util", label: "Utilities" }, { id: "food", label: "Groceries" }, { id: "fun", label: "Going out" },
  { id: "hsa", label: "HSA" }, { id: "invest", label: "Brokerage" },
].map((n, i) => ({ ...n, color: i === 0 ? "var(--wc-ink-2)" : undefined }));
const flowLinks = [
  { source: "income", target: "home", value: 2350 }, { source: "income", target: "living", value: 1400 }, { source: "income", target: "save", value: 1250 },
  { source: "home", target: "rent", value: 2100 }, { source: "home", target: "util", value: 250 },
  { source: "living", target: "food", value: 820 }, { source: "living", target: "fun", value: 580 },
  { source: "save", target: "hsa", value: 700 }, { source: "save", target: "invest", value: 550 },
];
// Forecast with an uncertainty band that widens with distance.
const fc = Array.from({ length: 18 }, (_, i) => {
  const v = Math.round(5200 + i * 310 + Math.sin(i * 0.9) * 380);
  const w = i < 11 ? 0 : (i - 10) * 260;
  return { date: new Date(2026, i, 1), value: v, low: i < 11 ? null : v - w, high: i < 11 ? null : v + w };
});
// 10,000 hourly readings: LTTB keeps the peaks while drawing about 1.5 points per pixel.
const dense = Array.from({ length: 10000 }, (_, i) => ({ date: new Date(2026, 0, 1, i), value: Math.round(220 + 60 * Math.sin(i / 240) + 25 * Math.sin(i / 17) + (i % 1777 === 300 ? 260 : 0) + (rnd() - 0.5) * 30) }));
const smDates = months.map((_, i) => new Date(2026, i, 1));
const walk = (b: number, d: number) => months.map((_, i) => Math.round(b + d * i + (rnd() - 0.5) * b * 0.16));
const multiples = [
  { label: "Chicago", values: walk(410, 22) }, { label: "Austin", values: walk(300, 34) }, { label: "Denver", values: walk(360, -8) },
  { label: "Atlanta", values: walk(280, 12) }, { label: "Seattle", values: walk(390, 4) }, { label: "Boston", values: walk(250, 18).map((v, i) => (i === 4 ? null : v)) },
  { label: "Miami", values: walk(200, 26) }, { label: "Phoenix", values: walk(330, -14) },
];
const spark = (base: number, drift: number) => Array.from({ length: 12 }, (_, i) => Math.round(base + drift * i + (rnd() - 0.5) * base * 0.2));

function Set({ dark, title, brand }: { dark?: boolean; title: string; brand?: string }) {
  return (
    <section data-brand={brand} className={`${dark ? "dark" : ""} bg-wc-page px-6 py-10 font-wc text-wc-ink @container`}>
      <h2 className="mx-auto mb-6 max-w-[1360px] text-[13px] font-medium uppercase tracking-[0.08em] text-wc-muted">{title}</h2>
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-start gap-5 md:grid-flow-dense md:grid-cols-2 xl:grid-cols-3">
        <Wide><StatStrip title="This month" items={[
          { label: "Revenue", value: 48210, kind: "currency", delta: 0.124, note: "vs September" },
          { label: "Active users", value: 12840, delta: 0.031, note: "vs September" },
          { label: "Refunds", value: 1320, kind: "currency", delta: -0.18, polarity: "down-good", note: "Lower is better" },
          { label: "Churn", value: 0.021, kind: "percent", delta: 0.004, polarity: "down-good", note: "Monthly" },
          { label: "NPS", value: null, note: "Survey opens Nov 3" },
        ]} source="Sample data" /></Wide>
        <Span2><TrendAreaChart title="Monthly revenue" subtitle="Up 31% on last year, and on track for the goal" data={trend} kind="currency" valueLabel="2026" compareLabel="2025"
          target={{ value: 9000, label: "Goal" }} annotations={[{ index: 5, text: "Price change" }]} forecastFrom={9} source="Billing system, sample" /></Span2>
        <Span2><TrendAreaChart title="Bookings forecast" subtitle="The range widens the further out we look" data={fc} valueLabel="Bookings" bandLabel="80% forecast range"
          events={[{ index: 3, text: "App launch" }, { index: 7, text: "Outage" }]} forecastFrom={11} source="Sample data" /></Span2>
        <Wide><SmallMultiples title="Weekly orders by city" subtitle="Austin and Miami grew fastest. Denver and Phoenix fell" dates={smDates} series={multiples} source="Sample data" /></Wide>
        <Span2><BulletChart title="Quarterly targets" subtitle="Two of four are on target" data={[
          { label: "Revenue", sublabel: "$ thousands", value: 268, target: 250, bands: [150, 225, 300] },
          { label: "New customers", value: 1700, target: 2000, bands: [1400, 2100, 2500] },
          { label: "Expansion", sublabel: "$ thousands", value: 82, target: 75, bands: [40, 70, 100] },
          { label: "Satisfaction", sublabel: "Out of 5", value: 3.6, target: 4.2, bands: [3, 4, 5] },
        ]} source="Sample data" /></Span2>
        <SlopeChart title="Market share" subtitle="Acme gained the most" fromLabel="2025" toLabel="2026" kind="percent" highlight={["Acme", "Globex"]} data={[
          { label: "Acme", from: 0.18, to: 0.27 }, { label: "Globex", from: 0.31, to: 0.24 }, { label: "Initech", from: 0.22, to: 0.21 },
          { label: "Umbrella", from: 0.14, to: 0.16 }, { label: "Hooli", from: 0.1, to: 0.08 },
        ]} source="Sample data" />
        <Span2><Waterfall title="Profit bridge" subtitle="Price gains covered the cost rise" kind="currency" start={{ label: "2025", value: 420000 }} endLabel="2026" steps={[
          { label: "Volume", value: 64000 }, { label: "Price", value: 91000 }, { label: "Costs", value: -118000 }, { label: "FX", value: -22000 }, { label: "Other", value: 9000 },
        ]} source="Sample data" /></Span2>
        <Span2><TrendAreaChart title="Server load, 10,000 readings" subtitle="Drawn from 10,000 hourly points. Spikes kept" data={dense} grain="day" valueLabel="Requests per second" source="Sample data" /></Span2>
        <KpiSparkCard title="Signups" value={1284} delta={0.142} note="last 30 days" series={spark(30, 3)} showMinMax source="Sample data" />
        <PairedBars title="Money in vs out" subtitle="June spending ran above income" data={paired} aLabel="In" bLabel="Out" kind="currency" activeIndex={5} />
        <DeltaBars title="Sales by region" subtitle="This quarter vs last" data={[
          { label: "North", current: 42000, previous: 38500 }, { label: "South", current: 31000, previous: 34200 },
          { label: "East", current: 27500, previous: 21000 }, { label: "West", current: 18200, previous: 18000 }, { label: "Online", current: 9400, previous: 0 },
        ]} kind="currency" />
        <DeltaBars title="Change in support tickets" subtitle="Fewer tickets is better" mode="change" polarity="down-good" data={[
          { label: "Billing", current: 120, previous: 160 }, { label: "Login", current: 210, previous: 180 },
          { label: "Shipping", current: 95, previous: 99 }, { label: "Returns", current: 60, previous: 82 },
        ]} />
        <GoalProgress title="Annual savings goal" value={14200} goal={20000} kind="currency" pace={0.83} deadline="by Dec 31" milestones={[{ at: 10000, label: "$10K" }]} />
        <BudgetCard title="Monthly ad budget" used={3480} limit={4000} cta={{ label: "Details" }} />
        <BudgetCard title="Cloud spend" variant="strip" used={5600} limit={5000} delta={0.21} />
        <Span2><ShareState id={`visits${dark ? "-d" : ""}${brand ? "-b" : ""}`}><StackedBars title="Visits by channel" subtitle="Search still brings half of all visits" series={series} data={stacked} picker /></ShareState></Span2>
        <StackedBars title="Channel mix" subtitle="Share of visits" series={series} data={stacked} mode="percent" />
        <Span2><CalendarHeatmap title="Daily orders" subtitle="Weekdays carry most orders" data={days} unit="orders" source="Sample data" /></Span2>
        <RadialBars title="Spending by month" centerLabel="Spent this year" data={months.map((m, i) => ({ label: m, value: [120, 80, 340, 60, 90, 410, 70, 150, 260, 95, 60, 110][i] }))} maxSize={240} />
        <Span2><SparkTable title="Top products" subtitle="Sorted by revenue" kind="currency" rows={[
          { label: "Starter plan", sublabel: "Monthly", value: 21400, previous: 19800, series: spark(1600, 40) },
          { label: "Team plan", sublabel: "Annual", value: 18300, previous: 20100, series: spark(1700, -25) },
          { label: "Add-on seats", value: 6200, previous: 4100, series: spark(330, 22) },
          { label: "Support pack", value: 2100, previous: 0, series: [2100] },
        ]} /></Span2>
        <CategoryBreakdown title="Spend by category" data={[
          { label: "Payroll", value: 18400 }, { label: "Software", value: 6200 }, { label: "Ads", value: 4800 }, { label: "Travel", value: 2100 },
          { label: "Office", value: 900 }, { label: "Meals", value: 640 }, { label: "Misc", value: 300 },
        ]} />
        <Span2><SankeyFlow title="Where October's pay went" subtitle="A quarter went to savings" nodes={flowNodes} links={flowLinks} source="Sample data" /></Span2>
        <RangeBars title="Price range by plan" subtitle="Lowest to highest paid, with the average" data={[
          { label: "Starter", from: 9, to: 19, marker: 14 }, { label: "Team", from: 29, to: 59, marker: 41 },
          { label: "Business", from: 79, to: 149, marker: 102 }, { label: "Enterprise", from: 180, to: 240, marker: 205 },
        ]} kind="currency" sort={false} />
        <Span2><RangeBars variant="dumbbell" title="Wait time by clinic" subtitle="Minutes, last year vs this year. Shorter is better" polarity="down-good" fromLabel="2025" toLabel="2026" data={[
          { label: "Downtown", from: 42, to: 28 }, { label: "Northside", from: 35, to: 31 }, { label: "Lakeview", from: 22, to: 26 },
          { label: "Airport", from: 51, to: 33 }, { label: "Riverside", from: 30, to: null },
        ]} /></Span2>
        <SankeyFlow title="Loading flow" nodes={[]} links={[]} status="loading" />
        <SankeyFlow title="Single flow" nodes={flowNodes.slice(0, 2)} links={flowLinks.slice(0, 1)} height={160} />
        <RangeBars title="Single range" data={[{ label: "Starter", from: 9, to: 19 }]} kind="currency" />
        <RangeBars variant="dumbbell" title="Empty dumbbell" data={[]} emptyText="No clinics reported yet." />
        <SankeyFlow title="Flow error" nodes={[]} links={[]} status="error" onRetry={() => {}} />
        <TrendAreaChart title="Loading state" data={[]} status="loading" />
        <PairedBars title="Error state" data={[]} status="error" onRetry={() => {}} />
        <KpiSparkCard title="Single reading" value={42} series={[42]} delta={null} />
        <BulletChart title="Empty bullet" data={[]} />
        <Waterfall title="Waterfall loading" start={{ label: "Start", value: 0 }} steps={[]} status="loading" />
        <TrendAreaChart title="Sparse data" subtitle="Two readings so far" data={trend.slice(0, 2)} kind="currency" />
        <StackedBars title="Empty state" series={series} data={[]} emptyText="No visits in this range yet." />
        <div className="md:col-span-2 xl:col-span-1"><GoalProgress title="Goal reached" value={21000} goal={20000} kind="currency" /></div>
        <Span2><TrendAreaChart title="Bad data: trend" subtitle="Two readings are missing, so the line joins across them" kind="currency"
          events={[{ index: 5, text: "Event" }]}
          data={[4200, 4800, null, 5200, null, 5900, 6300, 6100].map((value, i) => ({ date: new Date(2026, i, 1), value }))} source="Sample data" /></Span2>
        <Span2><TrendAreaChart title="Bad data: forecast" subtitle="A gap right at the forecast start" forecastFrom={3}
          data={[10, 20, 30, null, 50, 60].map((value, i) => ({ date: new Date(2026, i, 1), value }))} source="Sample data" /></Span2>
        <Span2><TrendAreaChart title="Bad data: all forecast" subtitle="No reading before the forecast start" forecastFrom={1}
          data={[null, null, 30, 40].map((value, i) => ({ date: new Date(2026, i, 1), value }))} source="Sample data" /></Span2>
        <Span2><PairedBars title="Bad data: paired" subtitle="A negative month and a missing reading" kind="currency" activeIndex={1} data={[
          { label: "Jan", a: 2400, b: 1800 }, { label: "Feb", a: -900, b: 1500 }, { label: "Mar", a: 2100, b: null }, { label: "Apr", a: 1900, b: -600 },
        ]} /></Span2>
        <StackedBars title="Bad data: stacked" subtitle="A missing value and a negative one are not drawn" series={series} data={[
          { label: "Jan", values: [300, 200, 100, 40] }, { label: "Feb", values: [300, -100, 200, null] }, { label: "Mar", values: [320, 180, 90, 50] },
        ]} />
        <StackedBars title="Bad data: all negative" subtitle="Nothing to draw, but the data is not empty" series={series} data={[
          { label: "Jan", values: [-300, -200, -100, -40] }, { label: "Feb", values: [-250, -150, -90, -30] },
        ]} />
      </div>
    </section>
  );
}
const Span2 = ({ children }: { children: ReactNode }) => <div className="md:col-span-2">{children}</div>;
const Wide = ({ children }: { children: ReactNode }) => <div className="md:col-span-2 xl:col-span-3">{children}</div>;


function App() {
  const mode = location.hash.slice(1);
  return (
    <main>
      <div className={mode === "dark" ? "dark" : undefined}><div className="flex items-center justify-end bg-wc-page px-6 pt-4 font-wc"><ChartPrefs /></div></div>
      {mode === "brand" ? (<>
        <Set brand="example" title="Brand example, light" />
        <div className="dark"><Set brand="example" title="Brand example, dark" /></div>
      </>) : (<>
        {mode !== "dark" && <Set title="Light" />}
        {mode !== "light" && <Set dark title="Dark" />}
      </>)}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
