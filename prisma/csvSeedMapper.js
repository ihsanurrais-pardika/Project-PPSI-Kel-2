const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CSV_PATH = path.resolve(__dirname, '..', 'classes_fti_ganjil_2026-v2.csv');

/**
 * Parse RFC-4180 CSV text (handles UTF-8 BOM, CRLF/LF, and quoted commas).
 * @param {string} content
 * @returns {Array<Record<string, string>>}
 */
function parseCsv(content) {
  const clean = content.replace(/^\uFEFF/, '');
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && clean[i + 1] === '\n') {
        i += 1;
      }
      row.push(field.trim());
      if (row.some((cell) => cell !== '')) {
        records.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell !== '')) {
      records.push(row);
    }
  }

  if (records.length === 0) {
    return [];
  }

  const [headers, ...bodyRows] = records;
  return bodyRows.map((cells) => {
    const obj = {};
    for (let idx = 0; idx < headers.length; idx += 1) {
      obj[headers[idx]] = cells[idx] ?? '';
    }
    return obj;
  });
}

function parseBool(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function parsePositiveInt(value, fallback = 0) {
  const n = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Determine owning ProgramStudi code ('SI', 'IF', 'TK') for MataKuliah.
 * Shared MKU courses are flagged via lintas_prodi = true while referencing a valid ProgramStudi.
 */
function resolveCourseProdiCode(courseCode, rawDepartment) {
  const code = courseCode.toUpperCase();
  if (/^(CCE|SCE|ECS|SSC)/.test(code)) return 'TK';
  if (/^(DSI|PSI|TSI)/.test(code)) return 'SI';
  if (/^(DIF|TIF)/.test(code)) return 'IF';

  const dept = (rawDepartment || '').toUpperCase().trim();
  if (dept === 'TK' || dept === 'SI' || dept === 'IF') return dept;
  return 'SI';
}

function resolveJenisMk(row) {
  const code = row.course_code.toUpperCase();
  const roomType = row.room_type_needed;
  const requiresRoom = parseBool(row.requires_room);
  const isMandatory = parseBool(row.is_mandatory);
  const isElective = parseBool(row.is_elective);
  const isTransition = parseBool(row.is_transition_course);

  if (roomType === 'Lab') return 'Praktikum';
  if (isElective) return 'Pilihan';
  if (!isMandatory && isTransition) return 'Transisi';
  if (code.startsWith('MWU') || code.startsWith('AND')) {
    return requiresRoom ? 'Wajib Universitas' : 'Wajib Universitas (Non-Ruang)';
  }
  return requiresRoom ? 'Wajib Prodi' : 'Wajib Prodi (Non-Ruang)';
}

function normalizeCourseName(courseCode, namesSeen) {
  if (courseCode.toUpperCase() === 'MWU60101') {
    return 'Pendidikan Agama';
  }
  // Prefer the most descriptive name when minor variations exist across departments.
  return [...namesSeen].sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}

/**
 * Select, deduplicate, and normalize unique MataKuliah entities from class-level CSV rows.
 * @param {Array<Record<string, string>>} rows
 */
function selectMataKuliah(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const code = (row.course_code || '').trim();
    if (!code) continue;
    if (!grouped.has(code)) {
      grouped.set(code, []);
    }
    grouped.get(code).push(row);
  }

  const mataKuliahList = [];
  const multiDeptCodes = [];
  const dualRegularTransitionCodes = [];

  for (const [kodeMk, group] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const departmentsSeen = new Set(group.map((r) => r.department.toUpperCase()).filter(Boolean));
    const namesSeen = new Set(group.map((r) => r.name).filter(Boolean));

    const hasMandatoryRegular = group.some((r) => parseBool(r.is_mandatory) && !parseBool(r.is_transition_course));
    const hasTransition = group.some((r) => parseBool(r.is_transition_course));
    if (hasMandatoryRegular && hasTransition) {
      dualRegularTransitionCodes.push(kodeMk);
    }
    if (departmentsSeen.size > 1) {
      multiDeptCodes.push(kodeMk);
    }

    // Prioritize canonical mandatory non-transition offering, then earliest semester.
    const sortedCandidates = [...group].sort((a, b) => {
      const aCanon = parseBool(a.is_mandatory) && !parseBool(a.is_transition_course) ? 0 : 1;
      const bCanon = parseBool(b.is_mandatory) && !parseBool(b.is_transition_course) ? 0 : 1;
      if (aCanon !== bCanon) return aCanon - bCanon;
      return parsePositiveInt(a.semester, 1) - parsePositiveInt(b.semester, 1);
    });

    const canonical = sortedCandidates[0];
    const prodiCode = resolveCourseProdiCode(kodeMk, canonical.department);
    const lintasProdi = kodeMk.toUpperCase().startsWith('MWU') || kodeMk.toUpperCase().startsWith('AND601') || departmentsSeen.size > 1;

    mataKuliahList.push({
      kode_mk: kodeMk,
      nama_mk: normalizeCourseName(kodeMk, namesSeen),
      sks: parsePositiveInt(canonical.sks, 2),
      semester_paket: parsePositiveInt(canonical.semester, 1),
      jenis_mk: resolveJenisMk(canonical),
      lintas_prodi: lintasProdi,
      prodiCode,
    });
  }

  return {
    mataKuliahList,
    audit: {
      totalCsvRows: rows.length,
      uniqueMataKuliah: mataKuliahList.length,
      multiDeptCodes,
      dualRegularTransitionCodes,
    },
  };
}

/**
 * Select and normalize class offering (Kelas) records from CSV rows.
 * Ensures kode_kelas is unique per (semester, kode_mk) even when MKU or transition classes share labels.
 * @param {Array<Record<string, string>>} rows
 * @param {number} academicYearStart
 */
function selectKelas(rows, academicYearStart = 2026) {
  const labelCounts = new Map();
  for (const row of rows) {
    const key = `${row.course_code}::${row.class_label}`;
    labelCounts.set(key, (labelCounts.get(key) || 0) + 1);
  }

  return rows.map((row) => {
    const kodeMk = row.course_code.trim();
    const classLabel = row.class_label.trim();
    const collisionKey = `${kodeMk}::${classLabel}`;
    const hasCollision = (labelCounts.get(collisionKey) || 0) > 1;

    // For colliding labels (e.g. MWU60104-TK-A vs SI-A, DSI61116-S3-A vs S5-A), keep suffix from row.id.
    const idPrefix = `${kodeMk}-`;
    const suffix = row.id.startsWith(idPrefix) ? row.id.slice(idPrefix.length) : row.id;
    const kodeKelas = hasCollision ? suffix : classLabel;

    const semester = parsePositiveInt(row.semester, 1);
    const enrolledCount = parsePositiveInt(row.enrolled_count, 40);
    const isEstimated = parseBool(row.enrolled_is_estimated);
    const requiresRoom = parseBool(row.requires_room);
    const isTransition = parseBool(row.is_transition_course);

    let statusKelas = 'TERBUKA';
    if (!requiresRoom) {
      statusKelas = 'NON_RUANG';
    } else if (isTransition) {
      statusKelas = 'TRANSISI_TERBUKA';
    }

    return {
      kode_mk: kodeMk,
      kode_kelas: kodeKelas,
      pengajuProdiCode: (row.department || 'FTI').toUpperCase().trim(),
      target_angkatan: academicYearStart - Math.floor((semester - 1) / 2),
      estimasi_mahasiswa: enrolledCount,
      jumlah_peserta: isEstimated ? 0 : enrolledCount,
      butuh_aksesibilitas: parseBool(row.requires_accessibility),
      status_kelas: statusKelas,
    };
  });
}

function loadCsvSeedData(csvPath = DEFAULT_CSV_PATH) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw);
  const { mataKuliahList, audit } = selectMataKuliah(rows);
  const kelasList = selectKelas(rows, 2026);
  return { mataKuliahList, kelasList, audit };
}

module.exports = {
  DEFAULT_CSV_PATH,
  parseCsv,
  selectMataKuliah,
  selectKelas,
  loadCsvSeedData,
};
