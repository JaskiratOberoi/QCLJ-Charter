#!/usr/bin/env python3
"""Maglumi X3 IQC random-error pack (With error/).

Leaves the 2026 BIO RAD / LJ files untouched. For each listed date/assay,
copies that day's Maglumi print, pushes the concentration outside both the
Bio-Rad insert range and the lab ±2 SD window, adds an in-range repeat
print, and fills NDC/DI/7.3.7.

    python3 "docs/instrument-readings/Snibe Maglumi X3/2026/With error/_assets/generate_with_error.py"
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta
from io import BytesIO
from pathlib import Path

import fitz
from reportlab.lib.colors import Color, black
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE.parent
SRC_DIR = OUT_DIR.parent
FIXED = json.loads((SRC_DIR / "fixed-mean-sd-oct2025-first20.json").read_text())
OUT_PDF = OUT_DIR / "IQC Correction Maglumi 2026.pdf"
OUT_MAY8 = OUT_DIR / "IQC Correction 08 May 2026 BHCG Maglumi.pdf"
BRAND = Path("/Users/jas/Work/NABL 2026/app/public/brand")
FORM_PAGE = landscape(A4)

ARIAL = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
ARIAL_BD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
HAND = Path("/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf")
if ARIAL.exists():
    pdfmetrics.registerFont(TTFont("CalSans", str(ARIAL)))
    FONT = "CalSans"
else:
    FONT = "Helvetica"
if ARIAL_BD.exists():
    pdfmetrics.registerFont(TTFont("CalSans-Bold", str(ARIAL_BD)))
    FONT_BOLD = "CalSans-Bold"
else:
    FONT_BOLD = "Helvetica-Bold"
if HAND.exists():
    pdfmetrics.registerFont(TTFont("Hand", str(HAND)))
    HAND_FONT = "Hand"
else:
    HAND_FONT = FONT_BOLD

LINE = Color(0.2, 0.2, 0.2)
INK = Color(0.08, 0.16, 0.52)
HEADER_BG = (0.827, 0.827, 0.827)
MAG_LINE = (0.35, 0.35, 0.35)

ROOT_CAUSES = [
    "1) Reagent expiry, deterioration",
    "2) QC expiry, deterioration",
    "3) Equipment flag, functioning etc",
    "4) Environmental conditions",
    "5) Procedure violation",
    "6) Technician Fault",
]

COL_X = [30.1, 119.8, 186.9, 253.9, 309.8, 388.0, 455.0, 567.0]
TEXT_X = [33.85, 123.55, 190.6, 257.65, 313.5, 391.7, 458.75]
HDR_LABELS = ["Sample ID", "Assay", "RLU", "RLU CV", "Conc.", "Flag", "Finish Time"]
HDR_TOP, HDR_BOT = 65.2, 99.35
ROW_H = 16.55

ASSAYS = ["HCG/B-HCG", "FSH", "E2", "T3", "PRL", "TEST", "T4", "LH", "TSH"]
MONTH_STEM = {
    1: "JANUARY 2026",
    2: "FEBRUARY 2026",
    3: "MARCH 2026",
    4: "APRIL 2026",
    5: "MAY 2026",
    6: "JUNE 2026",
    7: "JULY 2026",
}

# Bio-Rad insert 2025-09-09, Maglumi-native units (PRL ÷21.2, T4 ÷10, TEST ×100).
INSERT = {
    "L1": {
        "E2": (61.0, 113.0, 87.1),
        "FSH": (5.31, 9.85, 7.58),
        "HCG/B-HCG": (6.09, 11.3, 8.70),
        "LH": (1.27, 2.37, 1.82),
        "PRL": (106 / 21.2, 196 / 21.2, 151 / 21.2),
        "T3": (0.493, 0.915, 0.704),
        "T4": (4.34, 8.06, 6.20),
        "TEST": (87.5, 163.0, 125.0),
        "TSH": (0.349, 0.649, 0.499),
    },
    "L2": {
        "E2": (225.0, 419.0, 322.0),
        "FSH": (17.9, 33.2, 25.5),
        "HCG/B-HCG": (16.2, 30.0, 23.1),
        "LH": (17.6, 32.6, 25.1),
        "PRL": (316 / 21.2, 588 / 21.2, 452 / 21.2),
        "T3": (1.30, 2.41, 1.85),
        "T4": (7.77, 14.4, 11.1),
        "TEST": (213.0, 395.0, 304.0),
        "TSH": (4.05, 7.53, 5.79),
    },
}

# User dates (DD/MM/2025 → 2026 pack). Level chosen as the lab outlier
# that day, or the nearer high/low if both levels were in.
EVENTS = [
    {"form_test": "PRL", "assay": "PRL", "day": date(2026, 5, 12), "level": "L2", "high": True},
    {"form_test": "FSH", "assay": "FSH", "day": date(2026, 6, 10), "level": "L1", "high": True},
    {"form_test": "TESTO", "assay": "TEST", "day": date(2026, 6, 10), "level": "L2", "high": True},
    {"form_test": "T3", "assay": "T3", "day": date(2026, 6, 12), "level": "L2", "high": True},
    {"form_test": "BHCG", "assay": "HCG/B-HCG", "day": date(2026, 6, 24), "level": "L2", "high": True},
    {"form_test": "T4", "assay": "T4", "day": date(2026, 7, 9), "level": "L1", "high": True},
    {"form_test": "TSH", "assay": "TSH", "day": date(2026, 4, 23), "level": "L1", "high": True},
    {"form_test": "T3", "assay": "T3", "day": date(2026, 4, 10), "level": "L1", "high": True},
    {"form_test": "FSH", "assay": "FSH", "day": date(2026, 3, 27), "level": "L2", "high": False},
    {"form_test": "E2", "assay": "E2", "day": date(2026, 3, 11), "level": "L1", "high": True},
    {"form_test": "TSH", "assay": "TSH", "day": date(2026, 3, 5), "level": "L2", "high": True},
    {"form_test": "PRL", "assay": "PRL", "day": date(2026, 2, 27), "level": "L1", "high": True},
    {"form_test": "TSH", "assay": "TSH", "day": date(2026, 2, 21), "level": "L1", "high": True},
    {"form_test": "E2", "assay": "E2", "day": date(2026, 1, 15), "level": "L2", "high": True},
    {"form_test": "PRL", "assay": "PRL", "day": date(2026, 1, 4), "level": "L1", "high": True},
    {"form_test": "BHCG", "assay": "HCG/B-HCG", "day": date(2026, 5, 8), "level": "L1", "high": True,
     "error_val": 11.80, "error_rlu": "24460", "repeat_val": 8.95, "repeat_rlu": "7078",
     "repeat_finish": "2026-05-08 12:01:37", "repeat_printed": "2026-05-08 14:29:20"},
]


def month_pdf(day: date, level: str) -> Path:
    return SRC_DIR / f"{MONTH_STEM[day.month]} BIO RAD {level}.pdf"


def form_date(day: date) -> str:
    return f"{day.day}/{day.month}/{day.strftime('%y')}"


def ndigits(conc_text: str) -> int:
    m = re.match(r"(\d+)\.(\d+)", conc_text)
    if m:
        return len(m.group(2))
    return 0


def fmt_val(val: float, nd: int, unit: str) -> str:
    if nd == 0:
        body = str(int(round(val)))
    else:
        body = f"{val:.{nd}f}"
    return f"{body} {unit}".replace("  ", " ")


def round_nd(val: float, nd: int) -> float:
    return float(f"{val:.{nd}f}") if nd else float(int(round(val)))


def pick_error(lab_lo, lab_hi, mfr_lo, mfr_hi, nd, high: bool) -> float:
    if high:
        v = max(lab_hi, mfr_hi) * 1.048
    else:
        v = min(lab_lo, mfr_lo) * 0.935
    out = round_nd(v, nd)
    if high and out <= max(lab_hi, mfr_hi):
        step = 10 ** (-nd) if nd else 1
        out = round_nd(max(lab_hi, mfr_hi) + 3 * step, nd)
    if not high and out >= min(lab_lo, mfr_lo):
        step = 10 ** (-nd) if nd else 1
        out = round_nd(min(lab_lo, mfr_lo) - 3 * step, nd)
    return out


def parse_row(text: str, assay: str) -> dict:
    mm = re.search(
        rf"{re.escape(assay)}\n(\d+)\n([\d.]+)\n([^\n]+)\n",
        text,
    )
    if not mm:
        raise RuntimeError(f"assay {assay} not on page")
    conc = mm.group(3).replace("\xa0", " ").strip()
    cm = re.match(r"([\d.]+)\s*(.*)$", conc)
    val = float(cm.group(1))
    unit = cm.group(2).strip()
    fm = re.search(
        rf"{re.escape(assay)}\n(\d+)\n([\d.]+)\n([^\n]+)\n\s*\n(20\d{{2}}-\d{{2}}-\d{{2}} \d{{2}}:\d{{2}}:\d{{2}})",
        text,
    )
    printed = re.search(r"(20\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})", text)
    return {
        "rlu": mm.group(1),
        "conc_text": conc,
        "val": val,
        "unit": unit,
        "nd": ndigits(conc),
        "finish": fm.group(4) if fm else None,
        "printed": printed.group(1) if printed else None,
    }


def find_page(src: fitz.Document, day: date) -> int:
    needle = day.isoformat()
    for i, pg in enumerate(src):
        head = "\n".join(pg.get_text().splitlines()[:4])
        if needle in head:
            return i
    raise RuntimeError(f"{needle} not in {src.name}")


def draw_footer(c: canvas.Canvas, left: float, right: float, fy: float, fh: float) -> None:
    logo = BRAND / "ndc-logo.png"
    qm = BRAND / "sign-quality-manager.png"
    ld = BRAND / "sign-lab-director.png"
    logo_slot = 54
    inner_right = right - logo_slot
    c.setStrokeColor(LINE)
    c.setFillColor(black)
    c.setLineWidth(0.7)
    c.line(left, fy + fh, right, fy + fh)
    c.line(left, fy + 46, inner_right, fy + 46)
    c.line(left, fy + 32, inner_right, fy + 32)
    c.line(left, fy + 18, right, fy + 18)
    c.line(inner_right, fy, inner_right, fy + fh)
    mid = left + (inner_right - left) * 0.58
    c.line(mid, fy + 32, mid, fy + fh)
    c.setFont(FONT_BOLD, 10)
    c.drawString(left + 8, fy + 52, "NOBLE DIAGNOSTIC CENTRE")
    c.setFont(FONT, 8)
    c.drawString(mid + 6, fy + 52, "Doc No. NDC / DI / 7.3.7")
    c.drawString(left + 8, fy + 37, "Documented Information – Ensuring validity of examination results")
    c.drawString(mid + 6, fy + 37, "Page 17 of clause 7.3.7")
    meta_w = (mid - left) / 4
    metas = [
        "Issue No. IV",
        "Issue Date: 01 04 2024",
        "Rev No. 00",
        "Revision Date: --",
    ]
    for i, m in enumerate(metas):
        x = left + i * meta_w
        if i:
            c.line(x, fy + 18, x, fy + 32)
        c.setFont(FONT, 7)
        c.drawString(x + 4, fy + 22, m)
    if qm.exists():
        c.drawImage(str(qm), left + 10, fy + 5, width=46, height=12, mask="auto", preserveAspectRatio=True)
    if ld.exists():
        c.drawImage(str(ld), left + 160, fy + 5, width=52, height=12, mask="auto", preserveAspectRatio=True)
    c.setFont(FONT, 6.5)
    c.drawString(left + 8, fy + 2, "Prepared By Quality Manager")
    c.drawString(left + 158, fy + 2, "Approved By Lab Director")
    c.line(mid, fy, mid, fy + 18)
    c.setFont(FONT_BOLD, 8)
    c.drawCentredString((mid + inner_right) / 2, fy + 5, "CONTROLLED COPY")
    if logo.exists():
        c.drawImage(str(logo), inner_right + 3, fy + 8, width=48, height=48, mask="auto", preserveAspectRatio=True)


def draw_form(c: canvas.Canvas, day: date, test: str) -> None:
    w, h = FORM_PAGE
    left, right = 18, w - 18
    fy, fh = 14, 64
    outer_top = h - 16
    table_w = right - left

    c.setFillColor(black)
    c.setFont(FONT_BOLD, 12)
    c.drawCentredString(w / 2, outer_top - 12, "IQC CORRECTIVE ACTION FORM")
    c.setFont(FONT, 8.5)
    c.drawCentredString(
        w / 2,
        outer_top - 25,
        "(Recording schedule – Whenever there is IQC outlier OR Westgard Rules violation)",
    )

    table_top = outer_top - 34
    table_bottom = fy + fh + 36
    fracs = [0.08, 0.11, 0.14, 0.08, 0.22, 0.13, 0.10, 0.07, 0.07]
    xs = [left]
    for frac in fracs:
        xs.append(xs[-1] + frac * table_w)
    xs[-1] = right

    header_h = 28
    header_bottom = table_top - header_h
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(left, table_top, right, table_top)
    c.line(left, header_bottom, right, header_bottom)
    c.line(left, table_bottom, right, table_bottom)
    for x in xs[1:-1]:
        c.line(x, table_top, x, table_bottom)

    labels = [
        "Date",
        "Test Parameter",
        "OUTLIER",
        "EQPT",
        "Root Cause – Please tick the reason",
        "Corrective Action Taken",
        "Preventive Action Taken",
        "Taken By (Sign of Tech)",
        "Verified By",
    ]
    c.setFillColor(black)
    for i, lab in enumerate(labels):
        cx = (xs[i] + xs[i + 1]) / 2
        if i == 2:
            c.setFont(FONT, 7.5)
            c.drawCentredString(cx, table_top - 11, "OUTLIER")
            c.setFont(FONT, 6)
            c.drawCentredString(cx, table_top - 21, "Daily QC Out / Monthly % CV")
            c.drawCentredString(cx, table_top - 29, "high Or Westgard Rule")
        elif i == 4:
            c.setFont(FONT, 7)
            c.drawCentredString(cx, table_top - 16, lab)
        elif i in (5, 6, 7):
            c.setFont(FONT, 7)
            words = lab.split()
            if len(words) > 2:
                c.drawCentredString(cx, table_top - 12, " ".join(words[:2]))
                c.drawCentredString(cx, table_top - 22, " ".join(words[2:]))
            else:
                c.drawCentredString(cx, table_top - 16, lab)
        else:
            c.setFont(FONT, 8)
            c.drawCentredString(cx, table_top - 16, lab)

    n_rows = 2
    body_h = header_bottom - table_bottom
    row_h = body_h / n_rows
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    for i in range(1, n_rows):
        c.line(left, header_bottom - i * row_h, right, header_bottom - i * row_h)
    c.setFont(FONT, 6.5)
    c.setFillColor(black)
    for r in range(n_rows):
        top = header_bottom - r * row_h
        for j, line in enumerate(ROOT_CAUSES):
            c.drawString(xs[4] + 4, top - 10 - j * 9.2, line)

    top = header_bottom
    mid_y = top - row_h * 0.42
    dstr = form_date(day)
    c.setFillColor(INK)
    c.setFont(HAND_FONT, 15)
    c.drawCentredString((xs[0] + xs[1]) / 2, mid_y, dstr)
    c.setFont(HAND_FONT, 14 if len(test) <= 4 else 12)
    c.drawCentredString((xs[1] + xs[2]) / 2, mid_y, test)
    c.setFont(HAND_FONT, 13)
    c.drawCentredString((xs[2] + xs[3]) / 2, mid_y + 6, "Daily QC")
    c.drawCentredString((xs[2] + xs[3]) / 2, mid_y - 10, "Out")
    c.setFont(HAND_FONT, 12)
    c.drawCentredString((xs[3] + xs[4]) / 2, mid_y + 6, "Maglumi")
    c.drawCentredString((xs[3] + xs[4]) / 2, mid_y - 10, "X3")
    c.setFont(HAND_FONT, 12)
    act_x = xs[5] + 8
    act_y = top - 22
    for line in ("Random error.", "QC - Repeat.", "Correct result", "obtained."):
        c.drawString(act_x, act_y, line)
        act_y -= 14
    c.setFont(HAND_FONT, 16)
    c.drawCentredString((xs[7] + xs[8]) / 2, mid_y + 8, "P")
    c.setFont(HAND_FONT, 11)
    c.drawCentredString((xs[7] + xs[8]) / 2, mid_y - 10, dstr)

    c.setFillColor(black)
    c.setFont(FONT, 8)
    c.drawString(
        left + 6,
        table_bottom - 12,
        "Acceptance Criteria: Daily QC value within range specified by manufacturer for that control OR Westgard rule violation.",
    )
    c.drawString(
        left + 6,
        table_bottom - 24,
        "Monthly % CV: < MU OR 5 % for Hematology and < 10 % for Biochemistry whichever is higher.",
    )
    draw_footer(c, left, right, fy, fh)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.rect(left, fy, table_w, outer_top - fy, stroke=1, fill=0)


def form_pdf(day: date, test: str) -> fitz.Document:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=FORM_PAGE)
    c.setTitle("IQC Corrective Action Form")
    c.setAuthor("Noble Diagnostic Centre")
    draw_form(c, day, test)
    c.save()
    return fitz.open("pdf", buf.getvalue())


def hit_on_row(hits: list, y: float) -> fitz.Rect:
    nearby = [h for h in hits if abs(h.y0 - y) < 4]
    if len(nearby) != 1:
        raise RuntimeError(f"expected 1 hit on row y={y:.1f}, got {len(nearby)} from {len(hits)}")
    return nearby[0]


def original_page(src: fitz.Document, idx: int, assay: str, old_rlu: str, old_conc: str,
                  new_rlu: str, new_conc: str) -> fitz.Document:
    out = fitz.open()
    out.insert_pdf(src, from_page=idx, to_page=idx)
    page = out[0]
    assay_hits = page.search_for(assay)
    if len(assay_hits) != 1:
        raise RuntimeError(f"{assay} hits={len(assay_hits)}")
    y = assay_hits[0].y0
    rlu_rect = hit_on_row(page.search_for(old_rlu), y)
    conc_rect = hit_on_row(page.search_for(old_conc), y)
    page.add_redact_annot(rlu_rect, fill=(1, 1, 1))
    page.add_redact_annot(conc_rect, fill=(1, 1, 1))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
    for rect, text in ((rlu_rect, new_rlu), (conc_rect, new_conc)):
        page.insert_text(
            (rect.x0, rect.y1 - 1.6),
            text,
            fontsize=9,
            fontname="arial",
            fontfile=str(ARIAL),
            color=(0, 0, 0),
        )
    return out


def extract_snibe(src_page: fitz.Page) -> tuple[bytes, fitz.Rect]:
    info = src_page.get_image_info()[0]
    xref, smask = src_page.get_images()[0][:2]
    pix = fitz.Pixmap(src_page.parent, xref)
    if smask:
        pix = fitz.Pixmap(pix, fitz.Pixmap(src_page.parent, smask))
    return pix.tobytes("png"), fitz.Rect(info["bbox"])


def draw_cell(page: fitz.Page, x0, y0, x1, y1, fill=None):
    shape = page.new_shape()
    if fill:
        shape.draw_rect(fitz.Rect(x0, y0, x1, y1))
        shape.finish(color=MAG_LINE, fill=fill, width=0.55)
    else:
        shape.draw_rect(fitz.Rect(x0, y0, x1, y1))
        shape.finish(color=MAG_LINE, fill=None, width=0.55)
    shape.commit()


def repeat_page(src_page: fitz.Page, sample_id: str, assay: str, rlu: str,
                conc: str, printed: str, finish: str) -> fitz.Document:
    snibe_png, snibe_rect = extract_snibe(src_page)
    out = fitz.open()
    page = out.new_page(width=src_page.rect.width, height=src_page.rect.height)

    page.insert_text((23.5, 18.4), "Model: MAGLUMI X3", fontsize=9, fontname="arial", fontfile=str(ARIAL))
    page.insert_text((490.2, 18.4), printed, fontsize=9, fontname="arial", fontfile=str(ARIAL))
    page.insert_text((231.95, 47.2), "Sample Result Report", fontsize=13.5, fontname="arial", fontfile=str(ARIAL))

    for i in range(7):
        draw_cell(page, COL_X[i], HDR_TOP, COL_X[i + 1], HDR_BOT, fill=HEADER_BG)
        label = HDR_LABELS[i]
        if label == "RLU CV":
            page.insert_text((TEXT_X[i], 81.0), "RLU CV", fontsize=12, fontname="arial", fontfile=str(ARIAL))
            page.insert_text((TEXT_X[i], 94.8), "(%)", fontsize=12, fontname="arial", fontfile=str(ARIAL))
        else:
            page.insert_text((TEXT_X[i], 81.0), label, fontsize=12, fontname="arial", fontfile=str(ARIAL))

    row_top = HDR_BOT
    row_bot = HDR_BOT + ROW_H
    for i in range(7):
        draw_cell(page, COL_X[i], row_top, COL_X[i + 1], row_bot)

    cells = [sample_id, assay, rlu, "0", conc, "", finish]
    baseline = row_top + 12.3
    for i, val in enumerate(cells):
        if val:
            page.insert_text((TEXT_X[i], baseline), val, fontsize=9, fontname="arial", fontfile=str(ARIAL))

    page.insert_image(snibe_rect, stream=snibe_png)
    page.insert_text((526.55, 816.8), "Page 1 of 1", fontsize=9, fontname="arial", fontfile=str(ARIAL))
    return out


def shift_time(iso: str, seconds: int) -> str:
    dt = datetime.strptime(iso, "%Y-%m-%d %H:%M:%S")
    return (dt + timedelta(seconds=seconds)).strftime("%Y-%m-%d %H:%M:%S")


def load_event(ev: dict) -> dict:
    day, level, assay = ev["day"], ev["level"], ev["assay"]
    pdf = month_pdf(day, level)
    src = fitz.open(pdf)
    idx = find_page(src, day)
    row = parse_row(src[idx].get_text(), assay)
    mean = float(FIXED[level][assay][0])
    sd = float(FIXED[level][assay][1])
    lab_lo, lab_hi = mean - 2 * sd, mean + 2 * sd
    mfr_lo, mfr_hi, _ = INSERT[level][assay]
    nd = row["nd"]
    if "error_val" in ev:
        err = ev["error_val"]
        err_rlu = ev["error_rlu"]
        rep = ev["repeat_val"]
        rep_rlu = ev["repeat_rlu"]
        rep_finish = ev["repeat_finish"]
        rep_printed = ev["repeat_printed"]
    else:
        err = pick_error(lab_lo, lab_hi, mfr_lo, mfr_hi, nd, ev["high"])
        err_rlu = str(max(1, round(int(row["rlu"]) * err / row["val"])))
        rep = round_nd(mean, nd)
        if not (lab_lo < rep < lab_hi and mfr_lo < rep < mfr_hi):
            rep = round_nd((max(lab_lo, mfr_lo) + min(lab_hi, mfr_hi)) / 2, nd)
        rep_rlu = str(max(1, round(int(row["rlu"]) * rep / row["val"])))
        rep_finish = shift_time(row["finish"], 2 * 3600 + 18 * 60) if row["finish"] else None
        rep_printed = shift_time(row["printed"], 14) if row["printed"] else None
    if ev["high"]:
        assert err > lab_hi and err > mfr_hi, (assay, day, err, lab_hi, mfr_hi)
    else:
        assert err < lab_lo and err < mfr_lo, (assay, day, err, lab_lo, mfr_lo)
    assert lab_lo < rep < lab_hi and mfr_lo < rep < mfr_hi, (assay, day, rep, lab_lo, lab_hi, mfr_lo, mfr_hi)
    return {
        **ev,
        "src": src,
        "idx": idx,
        "row": row,
        "lab_lo": lab_lo,
        "lab_hi": lab_hi,
        "mfr_lo": mfr_lo,
        "mfr_hi": mfr_hi,
        "mean": mean,
        "err": err,
        "err_rlu": err_rlu,
        "err_conc": fmt_val(err, nd, row["unit"]),
        "rep": rep,
        "rep_rlu": rep_rlu,
        "rep_conc": fmt_val(rep, nd, row["unit"]),
        "rep_finish": rep_finish,
        "rep_printed": rep_printed,
        "sample_id": f"BIORAD {level} CON",
        "pdf_name": pdf.name,
    }


def build_event_pages(loaded: dict) -> list[fitz.Document]:
    form = form_pdf(loaded["day"], loaded["form_test"])
    original = original_page(
        loaded["src"],
        loaded["idx"],
        loaded["assay"],
        loaded["row"]["rlu"],
        loaded["row"]["conc_text"],
        loaded["err_rlu"],
        loaded["err_conc"],
    )
    repeat = repeat_page(
        loaded["src"][loaded["idx"]],
        loaded["sample_id"],
        loaded["assay"],
        loaded["rep_rlu"],
        loaded["rep_conc"],
        loaded["rep_printed"],
        loaded["rep_finish"],
    )
    return [form, original, repeat]


def main() -> None:
    loaded = [load_event(ev) for ev in EVENTS]
    loaded.sort(key=lambda e: (e["day"], e["form_test"]), reverse=True)

    combined = fitz.open()
    may8_docs = None
    for ev in loaded:
        pages = build_event_pages(ev)
        for p in pages:
            combined.insert_pdf(p)
        if ev["day"] == date(2026, 5, 8) and ev["assay"] == "HCG/B-HCG":
            may8_docs = pages
        print(
            f"{ev['day']} {ev['level']} {ev['assay']:10} "
            f"{ev['row']['val']} → {ev['err']} ({ev['err_conc']})  "
            f"repeat {ev['rep']}  "
            f"{'HIGH' if ev['high'] else 'LOW'}  "
            f"lab {ev['lab_lo']:.3f}–{ev['lab_hi']:.3f}  "
            f"mfr {ev['mfr_lo']:.3f}–{ev['mfr_hi']:.3f}  "
            f"{ev['pdf_name']}"
        )
        ev["src"].close()

    combined.save(OUT_PDF, deflate=True)
    print(f"wrote {OUT_PDF}  pages={combined.page_count}")
    if may8_docs:
        may = fitz.open()
        for p in may8_docs:
            may.insert_pdf(p)
        may.save(OUT_MAY8, deflate=True)
        print(f"wrote {OUT_MAY8}  pages={may.page_count}")


if __name__ == "__main__":
    main()
