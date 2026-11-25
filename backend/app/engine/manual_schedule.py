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
