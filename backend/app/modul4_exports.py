"""
Generator Ekspor Dokumen Resmi Modul 4 (Kebutuhan Departemen) - SIPRAMA FTI UNAND.
Menghasilkan file Excel (.xlsx) menggunakan openpyxl dan surat pengajuan PDF (.pdf) menggunakan fpdf2.
"""

from __future__ import annotations

import io
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from fpdf import FPDF
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

DEPT_META: Dict[str, Dict[str, str]] = {
    "SI": {
        "name": "Departemen Sistem Informasi",
        "kaprodi": "Ricky Akbar, M.Kom.",
        "nip": "19840915 200812 1 002",
        "doc_no": "228/UN.16.15.3.2/PK.01.00/2026",
    },
    "IF": {
        "name": "Departemen Informatika",
        "kaprodi": "Dr. Ir. Wahyudi, S.T., M.T.",
        "nip": "19760724 200212 1 001",
        "doc_no": "234/UN.16.15.3.3/PK.01.00/2026",
    },
    "TK": {
        "name": "Departemen Teknik Komputer",
        "kaprodi": "Dr. Eng. Tati Erlina, M.IT.",
        "nip": "19790412 200604 2 001",
        "doc_no": "B/131/UN16.15.3.1/PK.01.00/2026",
    },
    "ALL": {
        "name": "Fakultas Teknologi Informasi (SI, IF, TK)",
        "kaprodi": "Dr. Eng. Rahmadi, M.T.",
        "nip": "19750312 200212 1 002",
        "doc_no": "FTI/UN.16.15/PK.01.00/2026",
    },
}


def _safe_ascii(text: Any) -> str:
    """Normalisasi karakter agar aman dirender font standar PDF."""
    s = str(text or "")
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2265": ">=",
        "\u2264": "<=",
        "\u2022": "-",
    }
    for k, v in replacements.items():
        s = s.replace(k, v)
    return s.encode("latin-1", "replace").decode("latin-1")


def build_offerings_excel(
    classes: List[Any],
    department: Optional[str] = None,
    semester_label: str = "2026/2027 Ganjil",
    kuota_minimum: int = 15,
) -> bytes:
    """Bangun workbook Excel (.xlsx) dengan sheet Rincian Kelas dan Ringkasan per MK."""
    dept_key = (department or "ALL").strip().upper()
    meta = DEPT_META.get(dept_key, DEPT_META["ALL"])

    wb = Workbook()
    ws = wb.active
    ws.title = "Rincian Kelas"

    navy_fill = PatternFill(start_color="082C78", end_color="082C78", fill_type="solid")
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    sub_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid")
    warn_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    cancel_fill = PatternFill(start_color="FFE4E6", end_color="FFE4E6", fill_type="solid")
    thin_side = Side(border_style="thin", color="CBD5E1")
    border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    # Judul Dokumen
    ws.merge_cells("A1:L1")
    ws["A1"] = "REKAPITULASI KEBUTUHAN PERKULIAHAN - FTI UNIVERSITAS ANDALAS"
    ws["A1"].font = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
    ws["A1"].fill = navy_fill
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:L2")
    ws["A2"] = (
        f"Unit: {meta['name']}  |  Semester: {semester_label}  |  "
        f"Kuota Minimum: {kuota_minimum} Mhs  |  Diekspor: {datetime.now().strftime('%d-%m-%Y %H:%M')}"
    )
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="1E3A8A")
    ws["A2"].fill = sub_fill
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    headers = [
        "No",
        "ID Kelas",
        "Kode MK",
        "Nama Mata Kuliah",
        "Prodi",
        "Sem",
        "Kelas",
        "SKS",
        "Est. Mhs",
        "Tipe Ruang",
        "Dosen Pengampu",
        "Status & Kuota",
    ]
    header_row = 4
    ws.row_dimensions[header_row].height = 24
    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=h)
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border

    row_idx = header_row + 1
    total_mhs = 0
    for idx, c in enumerate(classes, start=1):
        status_kelas = getattr(c, "status_kelas", "TERBUKA")
        requires_room = getattr(c, "requires_room", True)
        enrolled = int(getattr(c, "enrolled_count", 0))
        is_cancelled = status_kelas == "DIBATALKAN"
        is_low = (not is_cancelled) and requires_room and enrolled < kuota_minimum

        if is_cancelled:
            note = f"DIBATALKAN ({getattr(c, 'alasan_pembatalan', '') or '-'})"
        elif is_low:
            note = f"{status_kelas} - Di Bawah Kuota (<{kuota_minimum})"
        else:
            note = status_kelas

        if not is_cancelled:
            total_mhs += enrolled

        values = [
            idx,
            c.id,
            c.course_code,
            c.name,
            c.department,
            c.semester,
            c.class_label,
            c.sks,
            enrolled,
            c.room_type_needed,
            ", ".join(c.lecturer_names or []),
            note,
        ]
        for col_idx, val in enumerate(values, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = Font(name="Calibri", size=10)
            cell.border = border
            if col_idx in (1, 5, 6, 7, 8, 9):
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
            if is_cancelled:
                cell.fill = cancel_fill
            elif is_low:
                cell.fill = warn_fill
        row_idx += 1

    # Summary row
    ws.cell(row=row_idx, column=1, value="TOTAL").font = Font(name="Calibri", size=10, bold=True)
    ws.cell(row=row_idx, column=4, value=f"{len(classes)} Kelas").font = Font(name="Calibri", size=10, bold=True)
    ws.cell(row=row_idx, column=9, value=total_mhs).font = Font(name="Calibri", size=10, bold=True)
    ws.cell(row=row_idx, column=9).alignment = Alignment(horizontal="center", vertical="center")
    for col_idx in range(1, 13):
        ws.cell(row=row_idx, column=col_idx).fill = sub_fill
        ws.cell(row=row_idx, column=col_idx).border = border

    widths = [6, 16, 14, 36, 8, 6, 10, 7, 10, 12, 34, 28]
    for col_idx, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = w

    # Sheet 2: Ringkasan per Mata Kuliah
    ws2 = wb.create_sheet(title="Ringkasan per MK")
    ws2.merge_cells("A1:H1")
    ws2["A1"] = f"RINGKASAN MATA KULIAH - {meta['name'].upper()}"
    ws2["A1"].font = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
    ws2["A1"].fill = navy_fill
    ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 24

    sum_headers = ["No", "Kode MK", "Nama Mata Kuliah", "Prodi", "Sem", "SKS", "Jumlah Rombel", "Total Est. Mhs"]
    for col_idx, h in enumerate(sum_headers, start=1):
        cell = ws2.cell(row=3, column=col_idx, value=h)
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border

    grouped: Dict[str, List[Any]] = defaultdict(list)
    for c in classes:
        if getattr(c, "status_kelas", "TERBUKA") != "DIBATALKAN":
            grouped[c.course_code].append(c)

    r2 = 4
    for idx, (code, items) in enumerate(sorted(grouped.items()), start=1):
        first = items[0]
        vals = [
            idx,
            code,
            first.name,
            first.department,
            first.semester,
            first.sks,
            len(items),
            sum(int(x.enrolled_count) for x in items),
        ]
        for col_idx, val in enumerate(vals, start=1):
            cell = ws2.cell(row=r2, column=col_idx, value=val)
            cell.font = Font(name="Calibri", size=10)
            cell.border = border
            cell.alignment = Alignment(
                horizontal="center" if col_idx in (1, 4, 5, 6, 7, 8) else "left",
                vertical="center",
            )
        r2 += 1

    for col_idx, w in enumerate([6, 14, 40, 8, 6, 7, 15, 16], start=1):
        ws2.column_dimensions[get_column_letter(col_idx)].width = w

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


class _SuratPDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            self.set_font("Helvetica", "B", 11)
            self.cell(0, 5, "KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI", ln=True, align="C")
            self.set_font("Helvetica", "B", 13)
            self.cell(0, 6, "UNIVERSITAS ANDALAS", ln=True, align="C")
            self.set_font("Helvetica", "B", 11)
            self.cell(0, 5, "FAKULTAS TEKNOLOGI INFORMASI", ln=True, align="C")
            self.set_font("Helvetica", "", 8.5)
            self.cell(0, 4, "Kampus Universitas Andalas Limau Manis, Padang 25163 | https://fti.unand.ac.id", ln=True, align="C")
            self.set_line_width(0.6)
            self.line(12, self.get_y() + 2, 198, self.get_y() + 2)
            self.set_line_width(0.2)
            self.line(12, self.get_y() + 3.2, 198, self.get_y() + 3.2)
            self.ln(7)

    def footer(self) -> None:
        self.set_y(-13)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 5, f"SIPRAMA FTI UNAND - Halaman {self.page_no()}/{{nb}}", align="C")


def build_offerings_pdf(
    classes: List[Any],
    department: Optional[str] = None,
    semester_label: str = "2026/2027 Ganjil",
    kuota_minimum: int = 15,
) -> bytes:
    """Bangun surat pengajuan resmi kebutuhan perkuliahan ber-kop FTI UNAND (.pdf)."""
    dept_key = (department or "ALL").strip().upper()
    meta = DEPT_META.get(dept_key, DEPT_META["ALL"])

    active_classes = [c for c in classes if getattr(c, "status_kelas", "TERBUKA") != "DIBATALKAN"]
    cancelled_count = len(classes) - len(active_classes)
    below_quota = [
        c for c in active_classes if getattr(c, "requires_room", True) and int(c.enrolled_count) < kuota_minimum
    ]
    unique_mk = len({c.course_code for c in active_classes})
    total_mhs = sum(int(c.enrolled_count) for c in active_classes)

    pdf = _SuratPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(12, 12, 12)
    pdf.add_page()

    # Meta surat
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(28, 5, "Nomor", border=0)
    pdf.cell(4, 5, ":", border=0)
    pdf.cell(0, 5, _safe_ascii(meta["doc_no"]), ln=True)

    pdf.cell(28, 5, "Perihal", border=0)
    pdf.cell(4, 5, ":", border=0)
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.cell(0, 5, _safe_ascii(f"Pengajuan Kebutuhan Perkuliahan Semester {semester_label}"), ln=True)

    pdf.set_font("Helvetica", "", 9.5)
    pdf.cell(28, 5, "Unit Pengaju", border=0)
    pdf.cell(4, 5, ":", border=0)
    pdf.cell(0, 5, _safe_ascii(meta["name"]), ln=True)

    pdf.cell(28, 5, "Kepada Yth.", border=0)
    pdf.cell(4, 5, ":", border=0)
    pdf.cell(0, 5, "Wakil Dekan I & Tim Penjadwalan Akademik FTI Universitas Andalas", ln=True)
    pdf.ln(3)

    # Ringkasan singkat
    pdf.set_fill_color(239, 246, 255)
    pdf.set_draw_color(191, 219, 254)
    pdf.set_font("Helvetica", "", 9)
    summary_text = (
        f"Ringkasan: {unique_mk} Mata Kuliah | {len(active_classes)} Kelas Aktif | "
        f"{total_mhs} Estimasi Mahasiswa | {len(below_quota)} Kelas < Kuota Min ({kuota_minimum}) | "
        f"{cancelled_count} Kelas Dibatalkan"
    )
    pdf.cell(0, 7, _safe_ascii(summary_text), border=1, ln=True, fill=True, align="C")
    pdf.ln(4)

    # Header Tabel
    col_w = [8, 21, 56, 9, 9, 13, 13, 16, 41]
    headers = ["No", "Kode MK", "Nama Mata Kuliah", "Sem", "SKS", "Kelas", "Mhs", "Ruang", "Dosen Pengampu"]

    def draw_table_header() -> None:
        pdf.set_fill_color(8, 44, 120)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 8)
        for w, h in zip(col_w, headers):
            pdf.cell(w, 6.5, h, border=1, align="C", fill=True)
        pdf.ln()
        pdf.set_text_color(15, 23, 42)

    draw_table_header()

    pdf.set_font("Helvetica", "", 7.5)
    for idx, c in enumerate(active_classes, start=1):
        if pdf.get_y() > 266:
            pdf.add_page()
            draw_table_header()
            pdf.set_font("Helvetica", "", 7.5)

        is_low = getattr(c, "requires_room", True) and int(c.enrolled_count) < kuota_minimum
        if is_low:
            pdf.set_fill_color(254, 243, 199)
        elif idx % 2 == 0:
            pdf.set_fill_color(248, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)

        mk_name = _safe_ascii(c.name)[:34]
        lec_name = _safe_ascii(", ".join(c.lecturer_names or ["-"]))[:24]
        cls_lbl = _safe_ascii(c.class_label)[:7]
        row_vals = [
            str(idx),
            _safe_ascii(c.course_code),
            mk_name,
            str(c.semester),
            str(c.sks),
            cls_lbl,
            str(c.enrolled_count),
            _safe_ascii(c.room_type_needed),
            lec_name,
        ]
        aligns = ["C", "L", "L", "C", "C", "C", "C", "C", "L"]
        for w, val, al in zip(col_w, row_vals, aligns):
            pdf.cell(w, 5.5, val, border=1, align=al, fill=True)
        pdf.ln()

    # Tanda tangan
    if pdf.get_y() > 235:
        pdf.add_page()
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(115, 5, "", border=0)
    pdf.cell(0, 5, f"Padang, {datetime.now().strftime('%d %B %Y')}", ln=True)
    pdf.cell(115, 5, "", border=0)
    pdf.cell(0, 5, _safe_ascii(f"Ketua {meta['name']},"), ln=True)
    pdf.ln(14)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(115, 5, "", border=0)
    pdf.cell(0, 5, _safe_ascii(meta["kaprodi"]), ln=True)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.cell(115, 4.5, "", border=0)
    pdf.cell(0, 4.5, _safe_ascii(f"NIP. {meta['nip']}"), ln=True)

    return bytes(pdf.output())
