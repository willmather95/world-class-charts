"use client";
// Flow between stages: where money, users or time goes (income -> spending groups -> items).
// A small dependency-free Sankey: nodes sit in columns by longest path (sinks pushed to the last
// column), node height = max(in, out), ribbons stack in the order of the node they connect to.
// Ribbons rest as a soft OKLab tint with a 1px full-color edge (>= 3:1). The active ribbon fills in
// and its end labels go bold. Middle columns are wide label blocks, so no ribbon crosses a label.
// Every node prints its name and value (blocks under 18px tall defer to the tooltip and table).
// Keep it to 2-3 columns and about 12 nodes; past that use a table.
// One tab stop; arrow keys move across flows (top to bottom, left to right). Hover or tap a ribbon.
// States: loading, error, empty (no flows or total 0), single flow. Cycles are ignored (dropped).
import { ChartCard, SparseNote, Tip, TipRow, type StateProps } from "./ChartCard";
import { fmt, fmtPercent, type NumKind } from "./format";
import { LiveRegion, usePlotNav } from "./interaction";
import { c, cat, dodge, sizeOf, soft, sum, useTween, useWidth } from "./lib";

/** Resting ribbon: a tint mixed in OKLab (keeps hue instead of going brown on dark), plus a 1px
 *  full-color edge for 3:1. In dark mode ribbons mix toward a mid gray (--wc-ribbon-base), because a tint mixed toward black turns orange brown. */
const ribbonRest = (col: string) => ({ fill: `color-mix(in oklch, ${col} var(--wc-ribbon-mix), var(--wc-ribbon-base))`, stroke: col, strokeWidth: 1 });

export type FlowNode = { id: string; label: string; color?: string };
export type FlowLink = { source: string; target: string; value: number };

type LNode = FlowNode & { i: number; depth: number; value: number; x: number; y: number; h: number; w: number; color: string };
type LLink = FlowLink & { i: number; s: LNode; t: LNode; w: number; sy: number; ty: number };

/** Pure layout. Exported so it can be unit tested or reused (for example on a server). */
export function sankeyLayout(nodes: FlowNode[], links: FlowLink[], values: number[], o: { x0: number; x1: number; height: number; nodeW: number; gap: number; midW?: number }) {
  const byId = new Map(nodes.map((n, i) => [n.id, i]));
  const ok = links.map((l, i) => ({ ...l, value: Math.max(0, values[i] ?? l.value), i })).filter((l) => byId.has(l.source) && byId.has(l.target) && l.source !== l.target);
  // Longest-path depth, guarded against cycles by capping passes.
  const depth = nodes.map(() => 0);
  for (let pass = 0; pass < nodes.length; pass++) {
    let moved = false;
    for (const l of ok) {
      const s = byId.get(l.source)!, t = byId.get(l.target)!;
      if (depth[t] < depth[s] + 1 && depth[s] + 1 < nodes.length) { depth[t] = depth[s] + 1; moved = true; }
    }
    if (!moved) break;
  }
  const maxD = Math.max(0, ...depth);
  const hasOut = nodes.map((n) => ok.some((l) => l.source === n.id));
  const hasAny = nodes.map((n) => ok.some((l) => l.source === n.id || l.target === n.id));
  nodes.forEach((_, i) => { if (!hasOut[i] && hasAny[i]) depth[i] = maxD; });
  const inV = nodes.map((n) => sum(ok.filter((l) => l.target === n.id).map((l) => l.value)));
  const outV = nodes.map((n) => sum(ok.filter((l) => l.source === n.id).map((l) => l.value)));
  const L: LNode[] = nodes.map((n, i) => ({
    ...n, i, depth: depth[i], value: Math.max(inV[i], outV[i]), x: 0, y: 0, h: 0, w: o.nodeW, color: n.color ?? cat(i),
  })).filter((_, i) => hasAny[i]);
  const cols = Array.from({ length: maxD + 1 }, (_, d) => L.filter((n) => n.depth === d));
  const ky = Math.min(...cols.filter((col) => col.length).map((col) => (o.height - (col.length - 1) * o.gap) / Math.max(1e-9, sum(col.map((n) => n.value)))));
  // Middle columns are wide "label blocks" (midW), so their names sit inside the node and no
  // ribbon ever crosses a label. The first and last columns stay thin and label in the gutters.
  const colW = (d: number) => (d > 0 && d < maxD ? o.midW ?? o.nodeW : o.nodeW);
  const fixed = sum(Array.from({ length: maxD + 1 }, (_, d) => colW(d)));
  const span = maxD === 0 ? 0 : (o.x1 - o.x0 - fixed) / maxD;
  const colX = (d: number) => o.x0 + sum(Array.from({ length: d }, (_, k) => colW(k))) + d * span;
  for (const col of cols) {
    const used = sum(col.map((n) => n.value * ky)) + (col.length - 1) * o.gap;
    let y = Math.max(0, (o.height - used) / 2);
    for (const n of col) { n.x = colX(n.depth); n.w = colW(n.depth); n.y = y; n.h = Math.max(1, n.value * ky); y += n.h + o.gap; }
  }
  const nodeOf = new Map(L.map((n) => [n.id, n]));
  const LL: LLink[] = ok.map((l) => ({ ...l, s: nodeOf.get(l.source)!, t: nodeOf.get(l.target)!, w: l.value * ky, sy: 0, ty: 0 }));
  for (const n of L) {
    let sy = n.y; for (const l of LL.filter((l) => l.s === n).sort((a, b) => a.t.y - b.t.y)) { l.sy = sy; sy += l.w; }
    let ty = n.y; for (const l of LL.filter((l) => l.t === n).sort((a, b) => a.s.y - b.s.y)) { l.ty = ty; ty += l.w; }
  }
  // Keyboard order: left to right, then top to bottom.
  LL.sort((a, b) => a.s.depth - b.s.depth || a.sy - b.sy);
  return { nodes: L, links: LL, cols, maxD };
}

const ribbon = (l: LLink) => {
  const xa = l.s.x + l.s.w, xb = l.t.x, xm = (xa + xb) / 2;
  return `M${xa},${l.sy}C${xm},${l.sy} ${xm},${l.ty} ${xb},${l.ty}L${xb},${l.ty + l.w}C${xm},${l.ty + l.w} ${xm},${l.sy + l.w} ${xa},${l.sy + l.w}Z`;
};
/** Ribbon center y at screen x (solves the cubic's x(t) by bisection). */
function ribbonHit(l: LLink, px: number, py: number) {
  const xa = l.s.x + l.s.w, xb = l.t.x;
  if (px < xa || px > xb) return false;
  let a = 0, b = 1;
  for (let k = 0; k < 18; k++) { const t = (a + b) / 2; const xt = xa + (xb - xa) * (1.5 * t - 1.5 * t * t + t * t * t); if (xt < px) a = t; else b = t; }
  const t = (a + b) / 2, e = 3 * t * t - 2 * t * t * t;
  const top = l.sy + (l.ty - l.sy) * e;
  return py >= top - 2 && py <= top + Math.max(4, l.w) + 2;
}

export function SankeyFlow({
  title, subtitle, nodes, links, kind = "currency", linkColor = "target", height = 300, source, ...state
}: StateProps & {
  title: string;
  subtitle?: string;
  nodes: FlowNode[];
  links: FlowLink[];
  kind?: NumKind;
  /** Color ribbons by the node they leave or the node they reach. "target" suits fan-out budgets. */
  linkColor?: "source" | "target";
  height?: number;
  source?: string;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>(560);
  const size = sizeOf(width);
  const vals = useTween(links.map((l) => Math.max(0, l.value)));
  const total = sum(links.map((l) => Math.max(0, l.value)));
  const empty = links.length === 0 || total === 0;
  const nodeW = 10, gap = size === "sm" ? 10 : 14;
  const labelW = size === "sm" ? 78 : 112;
  const midW = size === "sm" ? 72 : 104;
  const lay = sankeyLayout(nodes, links, vals, { x0: labelW, x1: width - labelW, height, nodeW, gap, midW });
  const n = lay.links.length;
  const nav = usePlotNav(n, (px, py) => {
    const hit = lay.links.findIndex((l) => ribbonHit(l, px, py - 4)); // the plot group sits 4px down
    return hit === -1 ? null : hit;
  }, 1, undefined, { values: () => lay.links.map((l) => links[l.i]?.value ?? 0) });
  const h = nav.active;
  const act = h != null ? lay.links[h] : null;
  const real = (l: LLink) => Math.max(0, links[l.i]?.value ?? 0);
  const outOf = (id: string) => sum(links.filter((x) => x.source === id).map((x) => Math.max(0, x.value)));
  const inOf = (id: string) => sum(links.filter((x) => x.target === id).map((x) => Math.max(0, x.value)));
  const share = (l: LLink) => { const o = outOf(l.source); return o ? real(l) / o : 0; };
  const top = lay.links.length ? lay.links.reduce((b, l) => (real(l) > real(b) ? l : b)) : null;
  const say = (l: LLink) => `${l.s.label} to ${l.t.label}: ${fmt(real(l), kind)}, ${fmtPercent(share(l))} of ${l.s.label}`;
  const nodeVal = (nd: LNode) => Math.max(inOf(nd.id), outOf(nd.id));
  // Gutter labels (first and last columns) are pushed apart so two-line labels never overlap.
  const labelY = new Map<string, number>();
  for (const col of [lay.cols[0] ?? [], lay.cols[lay.maxD] ?? []]) {
    const ys = dodge(col.map((nd) => nd.y + nd.h / 2), 30, 14, height - 14);
    col.forEach((nd, k) => labelY.set(nd.id, ys[k]));
  }
  const table = !empty ? {
    caption: title,
    columns: ["From", "To", "Amount", "Share of from"],
    rows: lay.links.map((l) => [l.s.label, l.t.label, fmt(real(l), kind, { compact: false }), fmtPercent(share(l))]),
  } : undefined;

  return (
    <ChartCard title={title} subtitle={subtitle} source={source} table={table} empty={empty} skeleton="flow" bodyHeight={height + 8} {...state}>
      <div ref={wrap}>
        <div {...nav.bind} role="group" aria-roledescription="flow chart" aria-label={`${title}. ${n} flows between ${lay.nodes.length} groups. Each ribbon's width shows its amount.${top ? ` Largest flow: ${top.s.label} to ${top.t.label}, ${fmt(real(top), kind)}, ${fmtPercent(share(top))} of ${top.s.label}.` : ""} Arrow keys move between flows. H jumps to the largest.`} style={{ ...nav.bind.style, height: height + 8 }}>
          <svg width={width} height={height + 8} className="block overflow-visible" aria-hidden>
            <g transform="translate(0,4)">
              {lay.links.map((l, i) => {
                const col = linkColor === "source" ? l.s.color : l.t.color;
                const on = i === h;
                return (
                  <path key={`${l.source}-${l.target}`} d={ribbon(l)} {...(on ? { fill: soft(col, 62), stroke: col, strokeWidth: 1.5 } : ribbonRest(col))} strokeLinejoin="round" className="wc-motion transition-[fill] duration-[var(--wc-dur-focus)]" />
                );
              })}
              {lay.nodes.map((nd) => {
                const bold = act != null && (act.s === nd || act.t === nd);
                const name = nd.label, val = fmt(nodeVal(nd), kind);
                const mid = nd.depth > 0 && nd.depth < lay.maxD;
                if (mid) {
                  // Label block: name and value live inside the node, so ribbons never cross them.
                  const chars = Math.floor((nd.w - 14) / 6.8);
                  const two = nd.h >= 34, one = nd.h >= 18;
                  const cy = nd.y + nd.h / 2;
                  return (
                    <g key={nd.id}>
                      <rect x={nd.x} y={nd.y} width={nd.w} height={nd.h} rx={4} fill={soft(nd.color, bold ? 30 : 16)} stroke={nd.color} strokeWidth={1} className="wc-motion transition-[fill] duration-[var(--wc-dur-focus)]" />
                      <rect x={nd.x} y={nd.y} width={4} height={nd.h} rx={2} fill={nd.color} />
                      {two ? (<>
                        <text x={nd.x + 11} y={cy - 3} fontSize="12" fill={c.ink2} fontWeight={bold ? 600 : 400}>{trim(name, chars)}</text>
                        <text x={nd.x + 11} y={cy + 12} fontSize="12" fill={c.ink} fontWeight={600} className="tabular-nums">{val}</text>
                      </>) : one ? (
                        <text x={nd.x + 11} y={cy + 4} fontSize="12" fill={c.ink} fontWeight={600} className="tabular-nums">{trim(`${name} ${val}`, chars)}</text>
                      ) : null}
                    </g>
                  );
                }
                const first = nd.depth === 0 && lay.maxD > 0;
                const ly = labelY.get(nd.id) ?? nd.y + nd.h / 2;
                const tx = first ? nd.x - 8 : nd.x + nd.w + 8;
                return (
                  <g key={nd.id}>
                    <rect x={nd.x} y={nd.y} width={nd.w} height={nd.h} rx={2} fill={nd.color} />
                    <text x={tx} y={ly - 3} fontSize="12" textAnchor={first ? "end" : "start"} fill={bold ? c.ink : c.ink2} fontWeight={bold ? 600 : 400}>{trim(name, size === "sm" ? 11 : 16)}</text>
                    <text x={tx} y={ly + 12} fontSize="12" textAnchor={first ? "end" : "start"} fill={c.ink} fontWeight={600} className="tabular-nums">{val}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          {act && (
            <Tip x={(act.s.x + act.s.w + act.t.x) / 2} y={(act.sy + act.ty) / 2 - 60} bound={width}>
              <div className="mb-1 text-[12px] text-wc-tip-muted">{act.s.label} {"\u2192"} {act.t.label}</div>
              <TipRow color={linkColor === "source" ? act.s.color : act.t.color} label="Amount" value={fmt(real(act), kind, { compact: false })} />
              <div className="mt-1 text-[12px] text-wc-tip-muted">{fmtPercent(share(act))} of {act.s.label}</div>
            </Tip>
          )}
          <LiveRegion at={nav.pos} text={act ? say(act) : ""} />
        </div>
      </div>
      {n === 1 && <SparseNote>One flow so far. Add more to see where it splits.</SparseNote>}
    </ChartCard>
  );
}

const trim = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}\u2026` : s);
