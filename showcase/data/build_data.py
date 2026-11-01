#!/usr/bin/env python3
"""Build showcase/src/energy.json from Our World in Data's energy dataset.

Usage: python3 -I data/build_data.py [path/to/owid_energy.csv]
With no path it downloads the CSV. It stops on a changed file, a missing value or a claim the
data no longer supports. Numbers are copied as published: only sums and shares are computed here.
Pass --accept-new-data after reviewing a newer release, then update SHA256 and RETRIEVED.
"""
import csv
import hashlib
import io
import json
import pathlib
import sys
import urllib.request

URL = "https://catalog.ourworldindata.org/energy/owid_energy/owid_energy.csv"
SHA256 = "9d8efc4a9b1cc2ffdfa7f7f6f1e171b2922e0be2d97c0edf2982e874357ed6de"
RETRIEVED = "2026-11-01"
FIRST, LAST = 2000, 2025
OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "energy.json"
SOURCES = ["coal", "gas", "oil", "nuclear", "hydro", "wind", "solar", "bioenergy", "other_renewables_excluding_bioenergy"]
# Display name -> OWID name. Short names keep the slope chart's labels whole.
COAL = {"UK": "United Kingdom", "Germany": "Germany", "US": "United States", "Poland": "Poland", "Australia": "Australia", "China": "China", "India": "India", "Vietnam": "Vietnam"}
RENEW = {"Netherlands": "Netherlands", "Germany": "Germany", "Spain": "Spain", "UK": "United Kingdom", "Australia": "Australia", "Brazil": "Brazil", "China": "China", "US": "United States"}
LARGEST = 10


def die(msg):
    sys.exit(f"build_data: {msg}")


def load(path):
    raw = pathlib.Path(path).read_bytes() if path else urllib.request.urlopen(URL, timeout=120).read()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != SHA256 and "--accept-new-data" not in sys.argv:
        die(f"source changed: {digest}. Review it, then rerun with --accept-new-data.")
    return list(csv.DictReader(io.StringIO(raw.decode("utf-8")))), digest


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    rows, digest = load(args[0] if args else None)
    idx = {(r["country"], int(r["year"])): r for r in rows}

    def num(country, year, col):
        val = idx.get((country, year), {}).get(col, "")
        if val == "":
            die(f"missing {col} for {country} {year}")
        return float(val)

    years = list(range(FIRST, LAST + 1))
    world = []
    for y in years:
        row = {"year": y, "total": num("World", y, "electricity_generation_twh")}
        row.update({s.split("_")[0]: num("World", y, f"{s}_electricity_twh") for s in SOURCES})
        row["lowCarbon"] = num("World", y, "low_carbon_electricity_share_pct") / 100
        parts = sum(row[s.split("_")[0]] for s in SOURCES)
        if abs(parts - row["total"]) > 0.5:
            die(f"World {y}: parts {parts} do not sum to total {row['total']}")
        world.append(row)

    def solar_wind(c, y):
        return num(c, y, "solar_electricity_twh") + num(c, y, "wind_electricity_twh")

    def renew_share(c, y):
        return solar_wind(c, y) / num(c, y, "electricity_generation_twh")

    span = list(range(2015, LAST + 1))
    coal = [{"label": k, "from": num(v, 2015, "coal_electricity_share_pct") / 100, "to": num(v, LAST, "coal_electricity_share_pct") / 100} for k, v in COAL.items()]
    renew = [{"label": k, "values": [renew_share(v, y) for y in span]} for k, v in RENEW.items()]
    renew.sort(key=lambda r: -r["values"][-1])
    countries = [r for r in rows if int(r["year"]) == LAST and r["iso_code"] and r["electricity_generation_twh"]]
    countries.sort(key=lambda r: -float(r["electricity_generation_twh"]))
    table = [{"label": r["country"], "series": [solar_wind(r["country"], y) for y in span], "generation": float(r["electricity_generation_twh"])} for r in countries[:LARGEST]]

    first, prev, last = world[0], world[-2], world[-1]
    sw = lambda r: r["solar"] + r["wind"]
    fossil = lambda r: r["coal"] + r["gas"] + r["oil"]
    # Every worded claim on the page. A new release that breaks one stops the build.
    checks = {
        "solar and wind covered over 99% of new generation": sw(last) - sw(prev) > 0.99 * (last["total"] - prev["total"]),
        "coal fell in 2025": last["coal"] < prev["coal"],
        "2024 is the coal high in this window": max(world, key=lambda r: r["coal"])["year"] == 2024,
        "coal share is the lowest since 2000": min(world, key=lambda r: r["coal"] / r["total"])["year"] == LAST,
        "solar passed wind for the first time in 2025": last["solar"] > last["wind"] and all(r["solar"] <= r["wind"] for r in world[:-1]),
        "coal still bigger than solar and wind": last["coal"] > sw(last),
        "fossil generation fell in 2025": fossil(last) < fossil(prev),
        "coal share rose in Vietnam only among the eight": [r["label"] for r in coal if r["to"] > r["from"]] == ["Vietnam"],
        "UK coal is under 0.5%": next(r for r in coal if r["label"] == "UK")["to"] < 0.005,
        "Poland is the biggest coal share fall": min(coal, key=lambda r: r["to"] - r["from"])["label"] == "Poland",
        "China leads the table": table[0]["label"] == "China",
        "solar and wind rose in every table row": all(t["series"][-1] > t["series"][0] for t in table),
        "the year starts at Ember's window": first["year"] == FIRST,
    }
    failed = [k for k, ok in checks.items() if not ok]
    if failed:
        die("claims no longer hold: " + "; ".join(failed))

    meta = {"url": URL, "sha256": digest, "retrieved": RETRIEVED, "firstYear": FIRST, "lastYear": LAST}
    OUT.write_text(json.dumps({"meta": meta, "world": world, "coal": coal, "renewYears": span, "renew": renew, "table": table}, indent=1) + "\n")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes), {len(checks)} claims hold")


main()
