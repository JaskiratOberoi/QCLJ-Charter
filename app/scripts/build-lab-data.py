#!/usr/bin/env python3
"""Build public/data/noble.json from the files in ../Reference Data.

Runs come from the 24 monthly Maglumi result PDFs (OCTOBER 2025 … SEPTEMBER 2026).
The superseded 9-day "SEP 2026" prints are skipped. Each event in
"With error/IQC Correction Maglumi 2026.pdf" (form, failed print, repeat print)
marks the failed result rejected, adds the repeat and records the corrective action.
Lab, instrument, tests, lot, insert ranges, fixed targets and holidays are kept
from the existing workspace file.

    python3 app/scripts/build-lab-data.py
"""
from __future__ import annotations

import base64
import json
import re
from datetime import datetime
from pathlib import Path

import fitz

APP = Path(__file__).resolve().parent.parent
REF = APP.parent / "Reference Data"
OUT = APP / "public" / "data" / "noble.json"
LOGO = Path("/Users/jas/Work/NABL 2026/app/public/brand/ndc-logo.png")
REPORT_LOGO = APP / "public" / "brand" / "meridian-logo.png"  # Stellar Meridian wordmark (replaced the QCDart logo 2026-10-20)
CORRECTION = REF / "With error" / "IQC Correction Maglumi 2026.pdf"

MONTHS = [
    "OCTOBER 2025", "NOVEMBER 2025", "DECEMBER 2025", "JANUARY 2026", "FEBRUARY 2026", "MARCH 2026",
    "APRIL 2026", "MAY 2026", "JUNE 2026", "JULY 2026", "AUG 2026", "SEPTEMBER 2026",
]
COL_X = [30.1, 119.8, 186.9, 253.9, 309.8, 388.0, 455.0, 567.0]
DT = re.compile(r"(20\d{2})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})")
FORM_TEST = {"BHCG": "hcg", "TESTO": "test", "E2": "e2", "FSH": "fsh", "LH": "lh", "PRL": "prl", "T3": "t3", "T4": "t4", "TSH": "tsh"}


def clean(s: str) -> str:
    return s.replace("\xa0", " ").replace("\xad", "-").strip()


def page_rows(page: fitz.Page) -> tuple[str | None, list[dict]]:
    """Result rows of one Sample Result Report page, cells assigned by column x."""
    lines: dict[int, list] = {}
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        if y0 < 100:
            continue
        key = round(y1)
        bucket = next((k for k in lines if abs(k - key) <= 2), key)
        lines.setdefault(bucket, []).append((x0, clean(word)))
    head = clean(page.get_text()[:200])
    pm = DT.search(head)
    printed = f"{pm[1]}-{pm[2]}-{pm[3]}" if pm else None
    rows = []
    for _, words in sorted(lines.items()):
        cells = [""] * 7
        for x, w in sorted(words):
            col = max(i for i in range(7) if x >= COL_X[i] - 2)
            cells[col] = f"{cells[col]} {w}".strip()
        sid, assay, rlu, _cv, conc, _flag, finish = cells
        fm = DT.search(finish)
        cm = re.match(r"([\d.]+)", conc)
        lm = re.search(r"L(\d)", sid)
        if not (fm and cm and lm and assay):
            continue
        rows.append({
            "level": int(lm[1]), "assay": assay, "rlu": int(rlu) if rlu.isdigit() else None,
            "value": float(cm[1]), "date": f"{fm[1]}-{fm[2]}-{fm[3]}", "time": fm[4],
        })
    return printed, rows


def main() -> None:
    ws = json.loads(OUT.read_text())
    lot = ws["lots"][0]["id"]
    by_code = {a["code"]: a["id"] for a in ws["analytes"]}
    target = {(t["analyteId"], t["level"]): t for t in ws["targets"]}

    runs: list[dict] = []
    for month in MONTHS:
        for lv in ("L1", "L2"):
            name = f"{month} BIO RAD {lv}.pdf"
            doc = fitz.open(REF / name)
            for page in doc:
                _, rows = page_rows(page)
                assert len(rows) == 9, (name, page.number, len(rows))
                for r in rows:
                    runs.append({
                        "id": f"r{len(runs) + 1}", "lotId": lot, "analyteId": by_code[r["assay"]], "level": r["level"],
                        "date": r["date"], "time": r["time"], "value": r["value"], "rlu": r["rlu"],
                        "source": "pdf", "fileName": name, "createdAt": 0,
                    })
    index = {(r["date"], r["level"], r["analyteId"]): r for r in runs}

    capas = []
    doc = fitz.open(CORRECTION)
    assert doc.page_count % 3 == 0
    for i in range(0, doc.page_count, 3):
        form = [clean(l) for l in doc[i].get_text().splitlines()]
        fi = next(j for j, l in enumerate(form) if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{2}", l))
        d, m, y = (int(x) for x in form[fi].split("/"))
        date = f"20{y:02d}-{m:02d}-{d:02d}"
        analyte = FORM_TEST[form[fi + 1]]
        _, repeat_rows = page_rows(doc[i + 2])
        assert len(repeat_rows) == 1, (i, repeat_rows)
        rep = repeat_rows[0]
        level = rep["level"]
        _, failed_rows = page_rows(doc[i + 1])
        err = next(r for r in failed_rows if by_code[r["assay"]] == analyte)
        assert rep["date"] == err["date"] == date and by_code[rep["assay"]] == analyte

        run = index[(date, level, analyte)]
        assert run["time"] == err["time"], (date, analyte, run["time"], err["time"])
        run.update(value=err["value"], rlu=err["rlu"], rejected=True, note="Random error · QC repeated", fileName=CORRECTION.name)
        repeat = {
            "id": f"r{len(runs) + 1}", "lotId": lot, "analyteId": analyte, "level": level, "date": date,
            "time": rep["time"], "value": rep["value"], "rlu": rep["rlu"], "source": "pdf",
            "fileName": CORRECTION.name, "note": "QC repeat", "createdAt": 0,
        }
        runs.append(repeat)

        t = target[(analyte, level)]
        z = (err["value"] - t["mean"]) / t["sd"]
        capas.append({
            "id": f"c{len(capas) + 1}", "runId": run["id"], "lotId": lot, "analyteId": analyte, "level": level,
            "date": date, "rule": "1-3s" if abs(z) > 3 else "1-2s", "outlierType": "Daily QC Out",
            "rootCauses": [], "corrective": "Random error. QC - Repeat. Correct result obtained.",
            "preventive": "", "takenBy": "", "verifiedBy": "P",
            "createdAt": int(datetime.fromisoformat(f"{date}T{rep['time']}").timestamp() * 1000),
        })
        print(f"{date} L{level} {analyte:5} failed {err['value']:>8} (z {z:+.2f}) → repeat {rep['value']}")

    runs.sort(key=lambda r: (r["date"], r.get("time") or "", r["level"]))
    ws["runs"] = runs
    ws["capas"] = sorted(capas, key=lambda c: c["date"])
    png = lambda p: "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
    if LOGO.exists():
        ws["lab"]["logoDataUrl"] = png(LOGO)
    ws["lab"]["reportLogoDataUrl"] = png(REPORT_LOGO)
    ws["lab"]["copyright"] = "© Copyright 2025 QCLJ Studio. All rights reserved."
    OUT.write_text(json.dumps(ws, separators=(",", ":")))
    print(f"{len(runs)} runs, {sum(1 for r in runs if r.get('rejected'))} rejected, {len(capas)} corrective actions → {OUT}")


if __name__ == "__main__":
    main()
