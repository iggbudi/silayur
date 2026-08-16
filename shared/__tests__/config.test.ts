import assert from "node:assert/strict";
import test from "node:test";
import {
  CONFIG_SECTION_KEYS,
  DEFAULT_PARK_NAME,
  HOUR_RANGE_SECTIONS,
  createEmptyConfigItems,
  getParkName,
  isValidHourRange,
} from "../config";

test("isValidHourRange menerima format HH.mm-HH.mm yang benar", () => {
  assert.equal(isValidHourRange("08.00-16.00"), true);
  assert.equal(isValidHourRange("06.00 - 14.00"), true, "spasi di sekitar minus");
  assert.equal(isValidHourRange("00.00-23.59"), true, "batas awal dan akhir hari");
  assert.equal(isValidHourRange("  08.00-16.00  "), true, "spasi luar di-trim");
});

test("isValidHourRange menolak format dan nilai jam tidak valid", () => {
  assert.equal(isValidHourRange("8.00-16.00"), false, "jam tanpa nol depan");
  assert.equal(isValidHourRange("08:00-16:00"), false, "pemisah titik dua");
  assert.equal(isValidHourRange("08.00 - 16.00 s/d 20.00"), false);
  assert.equal(isValidHourRange("08.00"), false, "hanya satu jam");
  assert.equal(isValidHourRange("Belum dikonfigurasi"), false);
  assert.equal(isValidHourRange(""), false);
});

test("isValidHourRange menolak nilai jam di luar batas dan rentang terbalik", () => {
  assert.equal(isValidHourRange("24.00-25.00"), false, "jam > 23");
  assert.equal(isValidHourRange("08.60-16.00"), false, "menit > 59");
  assert.equal(isValidHourRange("16.00-16.00"), false, "mulai = selesai");
  assert.equal(isValidHourRange("16.00-08.00"), false, "shift semalam tidak didukung");
});

test("section jam operasional & shift terdaftar di CONFIG_SECTION_KEYS", () => {
  assert.deepEqual(CONFIG_SECTION_KEYS.includes("operating-hours"), true);
  assert.deepEqual(CONFIG_SECTION_KEYS.includes("shifts"), true);
  assert.deepEqual(HOUR_RANGE_SECTIONS, ["operating-hours", "shifts"]);
});

test("createEmptyConfigItems memuat semua section", () => {
  const empty = createEmptyConfigItems();
  assert.deepEqual(Object.keys(empty).sort(), [
    "facilities",
    "hours",
    "identity",
    "operating-hours",
    "revenue",
    "shifts",
    "tickets",
  ]);
  for (const rows of Object.values(empty)) {
    assert.deepEqual(rows, []);
  }
});

test("getParkName membaca nama taman aktif dan memakai fallback default", () => {
  const empty = createEmptyConfigItems();
  assert.equal(getParkName(empty), DEFAULT_PARK_NAME);

  const withName = {
    ...empty,
    identity: [
      {
        id: "identity-park-name",
        section: "identity" as const,
        name: "Taman Bahagia",
        detail: "",
        active: true,
        sortOrder: 10,
      },
    ],
  };
  assert.equal(getParkName(withName), "Taman Bahagia");

  const blankName = {
    ...empty,
    identity: [
      {
        id: "identity-park-name",
        section: "identity" as const,
        name: "   ",
        detail: "",
        active: true,
        sortOrder: 10,
      },
    ],
  };
  assert.equal(getParkName(blankName), DEFAULT_PARK_NAME);

  const picksActiveFirst = {
    ...empty,
    identity: [
      {
        id: "identity-off",
        section: "identity" as const,
        name: "Nonaktif",
        detail: "",
        active: false,
        sortOrder: 10,
      },
      {
        id: "identity-on",
        section: "identity" as const,
        name: "Aktif",
        detail: "",
        active: true,
        sortOrder: 20,
      },
    ],
  };
  assert.equal(getParkName(picksActiveFirst), "Aktif");
});
