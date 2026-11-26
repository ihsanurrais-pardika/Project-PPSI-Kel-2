"""
Shared pure conflict-detection and 2-way swap validation helpers for manual
schedule editing. Used by both MySQLDataStore and InMemoryDataStore.
"""

from typing import Any, Dict, List, Optional, Set, Tuple

DAY_NORMALIZATION = {
    "SENIN": "Senin",
    "SELASA": "Selasa",
    "RABU": "Rabu",
    "KAMIS": "Kamis",
    "JUMAT": "Jumat",
}


class ScheduleConflictException(Exception):
    """Raised when a proposed manual move or swap introduces one or more conflicts."""

    def __init__(self, message: str, conflicts: List[Dict[str, Any]]):
        super().__init__(message)
        self.message = message
        self.conflicts = conflicts


def normalize_day_name(day: str) -> str:
    key = (day or "").strip().upper()
    if key not in DAY_NORMALIZATION:
        raise ValueError(f"Hari tidak valid: '{day}'. Gunakan Senin sampai Jumat.")
    return DAY_NORMALIZATION[key]


def parse_time_to_minutes(time_str: str) -> int:
    clean = (time_str or "").strip()
    if not clean:
        raise ValueError("Format jam tidak boleh kosong.")
    parts = clean.split(":")
    if len(parts) < 2:
        raise ValueError(f"Format jam tidak valid: '{time_str}'. Gunakan HH:MM.")
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError as exc:
        raise ValueError(f"Format jam tidak valid: '{time_str}'.") from exc
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError(f"Jam di luar rentang wajar: '{time_str}'.")
    return hour * 60 + minute


def minutes_to_hhmm(minutes: int) -> str:
    hour = (minutes // 60) % 24
    minute = minutes % 60
    return f"{hour:02d}:{minute:02d}"


def times_overlap(start_a: int, end_a: int, start_b: int, end_b: int) -> bool:
    return max(start_a, start_b) < min(end_a, end_b)


def is_placeholder_lecturer(name: str) -> bool:
    n = (name or "").strip().lower()
    if not n:
        return True
    return (
        n.startswith("dosen pengampu")
        or n.startswith("dosen mkwu")
        or n in ("tim dosen", "tba", "-")
    )


def _real_lecturers(names: List[str]) -> Set[str]:
    return {n.strip().lower() for n in (names or []) if not is_placeholder_lecturer(n)}


def evaluate_move_conflicts(
    target: Dict[str, Any],
    target_day: str,
    target_start_min: int,
    target_end_min: int,
    target_room_id: str,
    target_room_name: str,
    target_room_capacity: int,
    items: List[Dict[str, Any]],
    ignore_ids: Optional[Set[Any]] = None,
) -> List[Dict[str, Any]]:
    """Check capacity, room, lecturer, and rombel overlap for a proposed move."""
    if target_end_min <= target_start_min:
        raise ValueError("Jam selesai harus lebih akhir daripada jam mulai.")

    conflicts: List[Dict[str, Any]] = []
    norm_day = normalize_day_name(target_day)
    ignored = set(ignore_ids or set())
    ignored.add(target["item_id"])

    student_count = int(target.get("student_count") or 0)
    if target_room_capacity > 0 and student_count > target_room_capacity:
        conflicts.append(
            {
                "item_id": target["item_id"],
                "jadwal_id": target.get("jadwal_id"),
                "type": "CAPACITY",
                "type_label": "Kapasitas Ruang Kurang",
                "course_code": target["course_code"],
                "course_name": target["course_name"],
                "class_label": target["class_label"],
                "day": norm_day,
                "start_time": minutes_to_hhmm(target_start_min),
                "end_time": minutes_to_hhmm(target_end_min),
                "room_name": target_room_name,
                "lecturer_names": target.get("lecturer_names") or [],
                "reason": (
                    f"Ruang {target_room_name} berkapasitas {target_room_capacity} kursi, "
                    f"tidak mencukupi untuk {student_count} mahasiswa kelas {target['course_name']} ({target['class_label']})."
                ),
                "swappable": False,
            }
        )

    target_lecs = _real_lecturers(target.get("lecturer_names") or [])
    target_rombel = (target.get("rombel_key") or "").strip()
    target_mandatory = bool(target.get("is_mandatory", True))

    for other in items:
        if other["item_id"] in ignored:
            continue
        other_day = normalize_day_name(other["day"])
        if other_day != norm_day:
            continue
        if not times_overlap(target_start_min, target_end_min, other["start_min"], other["end_min"]):
            continue

        other_time = f"{minutes_to_hhmm(other['start_min'])} - {minutes_to_hhmm(other['end_min'])}"
        other_title = f"{other['course_name']} ({other['class_label']})"

        if str(other["room_id"]) == str(target_room_id):
            conflicts.append(
                {
                    "item_id": other["item_id"],
                    "jadwal_id": other.get("jadwal_id"),
                    "type": "ROOM",
                    "type_label": "Ruang Dipakai",
                    "course_code": other["course_code"],
                    "course_name": other["course_name"],
                    "class_label": other["class_label"],
                    "day": other_day,
                    "start_time": minutes_to_hhmm(other["start_min"]),
                    "end_time": minutes_to_hhmm(other["end_min"]),
                    "room_name": other["room_name"],
                    "lecturer_names": other.get("lecturer_names") or [],
                    "reason": (
                        f"Ruang {other['room_name']} pada {other_day} pukul {other_time} "
                        f"sudah digunakan oleh {other_title}."
                    ),
                    "swappable": True,
                }
            )

        other_lecs = _real_lecturers(other.get("lecturer_names") or [])
        shared_lecs = target_lecs & other_lecs
        if shared_lecs:
            sample_name = next(
                (n for n in (other.get("lecturer_names") or []) if n.strip().lower() in shared_lecs),
                "Dosen pengampu",
            )
            conflicts.append(
                {
                    "item_id": other["item_id"],
                    "jadwal_id": other.get("jadwal_id"),
                    "type": "LECTURER",
                    "type_label": "Dosen Bentrok",
                    "course_code": other["course_code"],
                    "course_name": other["course_name"],
                    "class_label": other["class_label"],
                    "day": other_day,
                    "start_time": minutes_to_hhmm(other["start_min"]),
                    "end_time": minutes_to_hhmm(other["end_min"]),
                    "room_name": other["room_name"],
                    "lecturer_names": other.get("lecturer_names") or [],
                    "reason": (
                        f"{sample_name} sudah terjadwal mengajar {other_title} "
                        f"pada {other_day} pukul {other_time} di {other['room_name']}."
                    ),
                    "swappable": True,
                }
            )

        other_rombel = (other.get("rombel_key") or "").strip()
        other_mandatory = bool(other.get("is_mandatory", True))
        if target_mandatory and other_mandatory and target_rombel and other_rombel == target_rombel:
            conflicts.append(
                {
                    "item_id": other["item_id"],
                    "jadwal_id": other.get("jadwal_id"),
                    "type": "ROMBEL",
                    "type_label": "Mahasiswa Bentrok",
                    "course_code": other["course_code"],
                    "course_name": other["course_name"],
                    "class_label": other["class_label"],
                    "day": other_day,
                    "start_time": minutes_to_hhmm(other["start_min"]),
                    "end_time": minutes_to_hhmm(other["end_min"]),
                    "room_name": other["room_name"],
                    "lecturer_names": other.get("lecturer_names") or [],
                    "reason": (
                        f"Kelas mahasiswa {target_rombel} juga memiliki jadwal {other_title} "
                        f"pada {other_day} pukul {other_time}."
                    ),
                    "swappable": True,
                }
            )

    return conflicts


def evaluate_swap_conflicts(
    item_a: Dict[str, Any],
    item_b: Dict[str, Any],
    all_items: List[Dict[str, Any]],
    a_sks_override: Optional[int] = None,
) -> Dict[str, Any]:
    """Validate 2-way schedule exchange A <-> B cleanly without leaving any conflict."""
    dur_a = (int(a_sks_override) * 50) if a_sks_override else max(50, int(item_a["end_min"]) - int(item_a["start_min"]))
    dur_b = max(50, int(item_b["end_min"]) - int(item_b["start_min"]))

    a_new_start = int(item_b["start_min"])
    a_new_end = a_new_start + dur_a
    b_new_start = int(item_a["start_min"])
    b_new_end = b_new_start + dur_b

    a_day_new = normalize_day_name(item_b["day"])
    b_day_new = normalize_day_name(item_a["day"])

    pair_ids = {item_a["item_id"], item_b["item_id"]}
    remaining = [it for it in all_items if it["item_id"] not in pair_ids]

    b_synthetic = {
        **item_b,
        "day": b_day_new,
        "start_min": b_new_start,
        "end_min": b_new_end,
        "room_id": item_a["room_id"],
        "room_name": item_a["room_name"],
        "room_capacity": item_a["room_capacity"],
    }
    a_synthetic = {
        **item_a,
        "day": a_day_new,
        "start_min": a_new_start,
        "end_min": a_new_end,
        "room_id": item_b["room_id"],
        "room_name": item_b["room_name"],
        "room_capacity": item_b["room_capacity"],
    }

    conflicts_a = evaluate_move_conflicts(
        target=item_a,
        target_day=a_day_new,
        target_start_min=a_new_start,
        target_end_min=a_new_end,
        target_room_id=item_b["room_id"],
        target_room_name=item_b["room_name"],
        target_room_capacity=int(item_b.get("room_capacity") or 0),
        items=remaining + [b_synthetic],
        ignore_ids={item_a["item_id"]},
    )

    conflicts_b = evaluate_move_conflicts(
        target=item_b,
        target_day=b_day_new,
        target_start_min=b_new_start,
        target_end_min=b_new_end,
        target_room_id=item_a["room_id"],
        target_room_name=item_a["room_name"],
        target_room_capacity=int(item_a.get("room_capacity") or 0),
        items=remaining + [a_synthetic],
        ignore_ids={item_b["item_id"]},
    )

    all_conflicts = conflicts_a + conflicts_b
    return {
        "is_safe": len(all_conflicts) == 0,
        "conflicts_a": conflicts_a,
        "conflicts_b": conflicts_b,
        "all_conflicts": all_conflicts,
        "a_new": {
            "item_id": item_a["item_id"],
            "day": a_day_new,
            "start_time": minutes_to_hhmm(a_new_start),
            "end_time": minutes_to_hhmm(a_new_end),
            "room_id": item_b["room_id"],
            "room_name": item_b["room_name"],
        },
        "b_new": {
            "item_id": item_b["item_id"],
            "day": b_day_new,
            "start_time": minutes_to_hhmm(b_new_start),
            "end_time": minutes_to_hhmm(b_new_end),
            "room_id": item_a["room_id"],
            "room_name": item_a["room_name"],
        },
    }


PRIMARY_SAFE_STARTS = ["07:30", "10:00", "13:30", "16:00", "09:10", "11:10"]
WEEKDAYS_ORDERED = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]

ISSUE_LABELS = {
    "ROOM": "Bentrok Ruang",
    "LECTURER": "Bentrok Dosen",
    "ROMBEL": "Bentrok Mahasiswa",
    "CAPACITY": "Kapasitas Kurang",
    "TIGHT_CAPACITY": "Kapasitas Mepet",
    "SHORT_TRANSIT": "Jeda Transit Singkat",
    "CATATAN_WADEK1": "Catatan Revisi Wadek I",
}


def _item_brief(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "item_id": item["item_id"],
        "jadwal_id": item.get("jadwal_id"),
        "course_code": item["course_code"],
        "course_name": item["course_name"],
        "class_label": item["class_label"],
        "department": item.get("department") or "SI",
        "day": normalize_day_name(item["day"]),
        "start_time": minutes_to_hhmm(int(item["start_min"])),
        "end_time": minutes_to_hhmm(int(item["end_min"])),
        "room_id": str(item["room_id"]),
        "room_name": item["room_name"],
        "room_capacity": int(item.get("room_capacity") or 0),
        "building": item.get("building") or "Gedung FTI",
        "student_count": int(item.get("student_count") or 0),
        "lecturer_names": list(item.get("lecturer_names") or []),
        "sks": int(item.get("sks") or 2),
    }


def suggest_safe_moves_for_item(
    target: Dict[str, Any],
    snapshot: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]],
    max_suggestions: int = 3,
    prefer_different_slot: bool = True,
) -> List[Dict[str, Any]]:
    """Find conflict-free room/time slots for a given scheduled class."""
    suggestions: List[Dict[str, Any]] = []
    seen: Set[Tuple[str, int, str]] = set()
    dur = max(50, int(target["end_min"]) - int(target["start_min"]))
    stu_count = int(target.get("student_count") or 0)
    cur_day = normalize_day_name(target["day"])
    cur_start = int(target["start_min"])
    cur_room = str(target["room_id"])

    eligible_rooms = sorted(
        [r for r in rooms if int(r.get("capacity") or 0) >= stu_count],
        key=lambda r: (0 if str(r["id"]) == cur_room else 1, abs(int(r.get("capacity") or 0) - stu_count)),
    )

    def try_candidate(cand_day: str, start_str: str, rm: Dict[str, Any]) -> None:
        if len(suggestions) >= max_suggestions:
            return
        s_min = parse_time_to_minutes(start_str)
        e_min = s_min + dur
        if e_min > 19 * 60:
            return
        if prefer_different_slot and cand_day == cur_day and s_min == cur_start and str(rm["id"]) == cur_room:
            return
        key = (cand_day, s_min, str(rm["id"]))
        if key in seen:
            return
        conflicts = evaluate_move_conflicts(
            target=target,
            target_day=cand_day,
            target_start_min=s_min,
            target_end_min=e_min,
            target_room_id=str(rm["id"]),
            target_room_name=rm["name"],
            target_room_capacity=int(rm["capacity"]),
            items=snapshot,
            ignore_ids={target["item_id"]},
        )
        if conflicts:
            return
        seen.add(key)
        e_str = minutes_to_hhmm(e_min)
        suggestions.append(
            {
                "action_type": "move",
                "target_item_id": target["item_id"],
                "target_jadwal_id": target.get("jadwal_id"),
                "course_name": target["course_name"],
                "class_label": target["class_label"],
                "day": cand_day,
                "start_time": start_str,
                "end_time": e_str,
                "room_id": str(rm["id"]),
                "room_name": rm["name"],
                "room_capacity": int(rm["capacity"]),
                "label": f"Pindah {target['course_name']} ke {cand_day} {start_str}–{e_str} · {rm['name']} (Kap. {rm['capacity']})",
            }
        )

    # 1. Ruang lain yang kosong di hari & jam yang sama (paling minim gangguan)
    cur_start_str = minutes_to_hhmm(cur_start)
    for rm in eligible_rooms:
        try_candidate(cur_day, cur_start_str, rm)

    # 2. Hari & jam lain yang bebas bentrok (utamakan blok non-tumpang-tindih)
    for d in WEEKDAYS_ORDERED:
        for st in PRIMARY_SAFE_STARTS:
            for rm in eligible_rooms:
                try_candidate(d, st, rm)
                if len(suggestions) >= max_suggestions:
                    return suggestions
    return suggestions


def scan_schedule_issues(
    snapshot: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]],
    include_suggestions: bool = True,
) -> List[Dict[str, Any]]:
    """Scan all schedule items once and return structured hard + soft validation issues."""
    issues: List[Dict[str, Any]] = []
    seen_keys: Set[Tuple[Any, Any, str]] = set()

    # 1. Hard check kapasitas kurang & Soft check kapasitas mepet per item
    for item in snapshot:
        cap = int(item.get("room_capacity") or 0)
        stu = int(item.get("student_count") or 0)
        jid = item.get("jadwal_id") or item["item_id"]
        if cap > 0 and stu > cap:
            key = (jid, jid, "CAPACITY")
            seen_keys.add(key)
            sugs = suggest_safe_moves_for_item(item, snapshot, rooms, max_suggestions=3) if include_suggestions else []
            issues.append(
                {
                    "id_1": item["item_id"],
                    "id_2": item["item_id"],
                    "jadwal_id_1": item.get("jadwal_id"),
                    "jadwal_id_2": item.get("jadwal_id"),
                    "jenis_bentrok": "CAPACITY",
                    "type_label": ISSUE_LABELS["CAPACITY"],
                    "severity": "hard",
                    "title": f"{item['course_name']} ({item['class_label']}) melebihi kapasitas ruang {item['room_name']}",
                    "description": (
                        f"Peserta {stu} mahasiswa ditempatkan di {item['room_name']} "
                        f"yang hanya berkapasitas {cap} kursi (kurang {stu - cap} kursi)."
                    ),
                    "recommendation": sugs[0]["label"] if sugs else "Pindahkan ke ruang berkapasitas lebih besar.",
                    "item_1": _item_brief(item),
                    "item_2": None,
                    "suggestions": sugs,
                }
            )
        elif cap > 0 and 0 <= (cap - stu) <= 2 and (stu / cap) >= 0.94:
            key = (jid, jid, "TIGHT_CAPACITY")
            seen_keys.add(key)
            sugs = suggest_safe_moves_for_item(item, snapshot, rooms, max_suggestions=2) if include_suggestions else []
            issues.append(
                {
                    "id_1": item["item_id"],
                    "id_2": item["item_id"],
                    "jadwal_id_1": item.get("jadwal_id"),
                    "jadwal_id_2": item.get("jadwal_id"),
                    "jenis_bentrok": "TIGHT_CAPACITY",
                    "type_label": ISSUE_LABELS["TIGHT_CAPACITY"],
                    "severity": "soft",
                    "title": f"Kapasitas {item['room_name']} hampir penuh untuk {item['course_name']} ({item['class_label']})",
                    "description": (
                        f"Terisi {stu} dari {cap} kursi (sisa {cap - stu} kursi cadangan). "
                        "Pertimbangkan ruang lebih lega bila ada penambahan peserta."
                    ),
                    "recommendation": sugs[0]["label"] if sugs else "Toleransi kapasitas dapat diterima bila peserta tetap.",
                    "item_1": _item_brief(item),
                    "item_2": None,
                    "suggestions": sugs,
                }
            )

    # 2. Pairwise checks (ROOM, LECTURER, ROMBEL, dan SHORT_TRANSIT)
    n = len(snapshot)
    for i in range(n):
        a = snapshot[i]
        a_day = normalize_day_name(a["day"])
        a_s = int(a["start_min"])
        a_e = int(a["end_min"])
        a_lecs = _real_lecturers(a.get("lecturer_names") or [])
        a_rombel = (a.get("rombel_key") or "").strip()
        a_mand = bool(a.get("is_mandatory", True))

        for j in range(i + 1, n):
            b = snapshot[j]
            b_day = normalize_day_name(b["day"])
            if a_day != b_day:
                continue

            b_s = int(b["start_min"])
            b_e = int(b["end_min"])

            # Ordering kanonik untuk kunci unik
            id_a = a.get("jadwal_id") or a["item_id"]
            id_b = b.get("jadwal_id") or b["item_id"]
            if str(id_a).isdigit() and str(id_b).isdigit():
                first, second = (a, b) if int(id_a) <= int(id_b) else (b, a)
            else:
                first, second = (a, b) if str(id_a) <= str(id_b) else (b, a)

            k1 = first.get("jadwal_id") or first["item_id"]
            k2 = second.get("jadwal_id") or second["item_id"]

            if times_overlap(a_s, a_e, b_s, b_e):
                detected_kinds: List[Tuple[str, str]] = []
                time_desc = (
                    f"{a_day}, {minutes_to_hhmm(a_s)}–{minutes_to_hhmm(a_e)} "
                    f"beririsan dengan {minutes_to_hhmm(b_s)}–{minutes_to_hhmm(b_e)}"
                )

                if str(a["room_id"]) == str(b["room_id"]):
                    detected_kinds.append(
                        (
                            "ROOM",
                            f"Ruang {a['room_name']} dipakai bersamaan oleh {a['course_name']} ({a['class_label']}) "
                            f"dan {b['course_name']} ({b['class_label']}) pada {time_desc}.",
                        )
                    )

                b_lecs = _real_lecturers(b.get("lecturer_names") or [])
                shared_lecs = a_lecs & b_lecs
                if shared_lecs:
                    lec_label = next(
                        (ln for ln in (a.get("lecturer_names") or []) if ln.strip().lower() in shared_lecs),
                        "Dosen pengampu",
                    )
                    detected_kinds.append(
                        (
                            "LECTURER",
                            f"{lec_label} dijadwalkan mengajar dua kelas bersamaan: "
                            f"{a['course_name']} ({a['class_label']}) dan {b['course_name']} ({b['class_label']}) pada {time_desc}.",
                        )
                    )

                b_rombel = (b.get("rombel_key") or "").strip()
                b_mand = bool(b.get("is_mandatory", True))
                if a_mand and b_mand and a_rombel and a_rombel == b_rombel:
                    detected_kinds.append(
                        (
                            "ROMBEL",
                            f"Mahasiswa rombel {a_rombel} bentrok antara {a['course_name']} ({a['class_label']}) "
                            f"dan {b['course_name']} ({b['class_label']}) pada {time_desc}.",
                        )
                    )

                for kind, desc in detected_kinds:
                    ckey = (k1, k2, kind)
                    if ckey in seen_keys:
                        continue
                    seen_keys.add(ckey)

                    sugs: List[Dict[str, Any]] = []
                    if include_suggestions:
                        sugs.extend(suggest_safe_moves_for_item(second, snapshot, rooms, max_suggestions=2))
                        if len(sugs) < 3:
                            sugs.extend(suggest_safe_moves_for_item(first, snapshot, rooms, max_suggestions=3 - len(sugs)))

                    issues.append(
                        {
                            "id_1": first["item_id"],
                            "id_2": second["item_id"],
                            "jadwal_id_1": first.get("jadwal_id"),
                            "jadwal_id_2": second.get("jadwal_id"),
                            "jenis_bentrok": kind,
                            "type_label": ISSUE_LABELS[kind],
                            "severity": "hard",
                            "title": f"{ISSUE_LABELS[kind]}: {first['course_name']} ({first['class_label']}) ↔ {second['course_name']} ({second['class_label']})",
                            "description": desc,
                            "recommendation": sugs[0]["label"] if sugs else "Pindahkan atau tukar salah satu kelas ke slot kosong.",
                            "item_1": _item_brief(first),
                            "item_2": _item_brief(second),
                            "suggestions": sugs,
                        }
                    )
            else:
                # Cek soft warning jeda singkat antar-gedung untuk dosen yang sama
                b_lecs = _real_lecturers(b.get("lecturer_names") or [])
                shared_lecs = a_lecs & b_lecs
                bld_a = (a.get("building") or "").strip()
                bld_b = (b.get("building") or "").strip()
                if shared_lecs and bld_a and bld_b and bld_a != bld_b:
                    gap_ab = b_s - a_e
                    gap_ba = a_s - b_e
                    gap = gap_ab if 0 <= gap_ab <= 20 else (gap_ba if 0 <= gap_ba <= 20 else -1)
                    if 0 <= gap <= 20:
                        ckey = (k1, k2, "SHORT_TRANSIT")
                        if ckey in seen_keys:
                            continue
                        seen_keys.add(ckey)
                        lec_label = next(
                            (ln for ln in (a.get("lecturer_names") or []) if ln.strip().lower() in shared_lecs),
                            "Dosen pengampu",
                        )
                        sugs = suggest_safe_moves_for_item(second, snapshot, rooms, max_suggestions=2) if include_suggestions else []
                        issues.append(
                            {
                                "id_1": first["item_id"],
                                "id_2": second["item_id"],
                                "jadwal_id_1": first.get("jadwal_id"),
                                "jadwal_id_2": second.get("jadwal_id"),
                                "jenis_bentrok": "SHORT_TRANSIT",
                                "type_label": ISSUE_LABELS["SHORT_TRANSIT"],
                                "severity": "soft",
                                "title": f"Jeda singkat ({gap} mnt) antar gedung: {lec_label}",
                                "description": (
                                    f"Pada {a_day}, {lec_label} berpindah antara {first['room_name']} ({first.get('building')}) "
                                    f"dan {second['room_name']} ({second.get('building')}) dengan jeda {gap} menit."
                                ),
                                "recommendation": sugs[0]["label"] if sugs else "Toleransi transit atau geser ke gedung yang sama.",
                                "item_1": _item_brief(first),
                                "item_2": _item_brief(second),
                                "suggestions": sugs,
                            }
                        )

    # Urutkan Hard Conflicts di atas Soft Warnings
    issues.sort(key=lambda x: (0 if x["severity"] == "hard" else 1, x["jenis_bentrok"], str(x["id_1"])))
    return issues


def plan_autofix_moves(
    snapshot: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]],
    max_moves: int = 120,
) -> List[Dict[str, Any]]:
    """Greedily compute verified conflict-free moves for all resolvable hard conflicts."""
    working = [{**it, "lecturer_names": list(it.get("lecturer_names") or [])} for it in snapshot]
    applied_moves: List[Dict[str, Any]] = []
    attempted_pairs: Set[Tuple[Any, Any, str]] = set()

    for _ in range(max_moves):
        hard_issues = [
            it for it in scan_schedule_issues(working, rooms, include_suggestions=False)
            if it["severity"] == "hard"
        ]
        if not hard_issues:
            break

        moved_this_round = False
        for issue in hard_issues:
            ckey = (issue["id_1"], issue["id_2"], issue["jenis_bentrok"])
            if ckey in attempted_pairs:
                continue

            cand_targets = [issue["id_2"]] if issue["id_2"] != issue["id_1"] else []
            cand_targets.append(issue["id_1"])

            for tid in cand_targets:
                target_item = next((w for w in working if w["item_id"] == tid), None)
                if not target_item:
                    continue
                sugs = suggest_safe_moves_for_item(target_item, working, rooms, max_suggestions=1)
                if not sugs:
                    continue
                sug = sugs[0]
                old_day = target_item["day"]
                old_start = minutes_to_hhmm(int(target_item["start_min"]))
                old_room_id = str(target_item["room_id"])

                target_item["day"] = sug["day"]
                target_item["start_min"] = parse_time_to_minutes(sug["start_time"])
                target_item["end_min"] = parse_time_to_minutes(sug["end_time"])
                target_item["room_id"] = str(sug["room_id"])
                target_item["room_name"] = sug["room_name"]
                target_item["room_capacity"] = int(sug["room_capacity"])

                applied_moves.append(
                    {
                        "item_id": tid,
                        "jadwal_id": target_item.get("jadwal_id"),
                        "course_name": target_item["course_name"],
                        "class_label": target_item["class_label"],
                        "old_day": old_day,
                        "old_start": old_start,
                        "old_room_id": old_room_id,
                        "day": sug["day"],
                        "start_time": sug["start_time"],
                        "end_time": sug["end_time"],
                        "room_id": str(sug["room_id"]),
                        "room_name": sug["room_name"],
                        "reason": f"Auto-Fix bentrok ({issue['type_label']})",
                    }
                )
                moved_this_round = True
                break

            if moved_this_round:
                break
            attempted_pairs.add(ckey)

        if not moved_this_round:
            break

    return applied_moves
