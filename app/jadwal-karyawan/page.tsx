"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SidebarFooter } from "../components/sidebar-footer";
import { SessionGate } from "../components/session-gate";
import { todayIsoDate } from "../../shared/date";
import {
  assignPic,
  createEmployee,
  createSchedule,
  fetchEmployees,
  fetchJadwal,
  type AttendanceStatus,
  type CreatePicInput,
  type CreateScheduleInput,
  type Employee,
  type JadwalSummary,
  type PicArea,
  type ShiftDefinition,
  type ShiftKey,
} from "../features/jadwal-karyawan";
import {
  AREAS,
  ATTENDANCE_STATUSES,
  DEFAULT_SHIFTS,
  getShiftLabel,
  getShiftTime,
  getStatusClass,
  getStatusLabel,
} from "../features/jadwal-karyawan";

const DAYS_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatTanggal(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00");
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export default function JadwalKaryawanPage() {
  const { session, ready: authReady, logout } = useSession();
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
  } = useMobileSidebar();

  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [summary, setSummary] = useState<JadwalSummary | null>(null);
  const [shifts, setShifts] = useState<ShiftDefinition[]>(DEFAULT_SHIFTS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Form states
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showPicForm, setShowPicForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formShift, setFormShift] = useState<ShiftKey>("morning");
  const [formStatus, setFormStatus] = useState<AttendanceStatus>("hadir");
  const [formNotes, setFormNotes] = useState("");
  const [formPicArea, setFormPicArea] = useState<PicArea>("Operasional");
  const [formPicTask, setFormPicTask] = useState("");
  const [formEmpName, setFormEmpName] = useState("");
  const [formEmpPosition, setFormEmpPosition] = useState("");
  const [formEmpArea, setFormEmpArea] = useState("");

  const loadData = useCallback(async (date: string) => {
    const [jadwal, empList] = await Promise.all([
      fetchJadwal(date),
      fetchEmployees(),
    ]);
    setSummary(jadwal.summary);
    setShifts(jadwal.shifts);
    setFormShift((current) =>
      jadwal.shifts.some((s) => s.key === current)
        ? current
        : (jadwal.shifts[0]?.key ?? ""),
    );
    setEmployees(empList.employees);
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadData(selectedDate);
        if (!cancelled) setError("");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Gagal memuat data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, selectedDate, loadData]);

  async function handleCreateSchedule() {
    if (!formEmployeeId) {
      setError("Pilih karyawan terlebih dahulu.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const input: CreateScheduleInput = {
        employeeId: formEmployeeId,
        date: selectedDate,
        shift: formShift,
        status: formStatus,
        notes: formNotes || undefined,
      };
      await createSchedule(input);
      setFormEmployeeId("");
      setFormNotes("");
      setShowScheduleForm(false);
      setNotice("Jadwal berhasil disimpan.");
      await loadData(selectedDate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan jadwal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignPic() {
    if (!formEmployeeId) {
      setError("Pilih karyawan terlebih dahulu.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const input: CreatePicInput = {
        employeeId: formEmployeeId,
        date: selectedDate,
        area: formPicArea,
        task: formPicTask || undefined,
      };
      await assignPic(input);
      setFormEmployeeId("");
      setFormPicTask("");
      setShowPicForm(false);
      setNotice("PIC berhasil ditugaskan.");
      await loadData(selectedDate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal assign PIC.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateEmployee() {
    if (!formEmpName.trim()) {
      setError("Nama karyawan wajib diisi.");
      return;
    }
    if (!formEmpPosition.trim()) {
      setError("Posisi wajib diisi.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await createEmployee({
        name: formEmpName.trim(),
        position: formEmpPosition.trim(),
        area: formEmpArea.trim() || undefined,
      });
      setFormEmpName("");
      setFormEmpPosition("");
      setFormEmpArea("");
      setShowEmployeeForm(false);
      setNotice("Karyawan berhasil ditambahkan.");
      await loadData(selectedDate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menambahkan karyawan.");
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) return <SessionGate title="Memuat jadwal karyawan…" />;
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }

  const access = session.access;
  const canView = access.jadwalKaryawan === "view" || access.jadwalKaryawan === "manage";
  const canManage = access.jadwalKaryawan === "manage";

  if (!canView) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat jadwal karyawan.</p>
        </div>
      </main>
    );
  }

  const schedules = summary?.schedulesToday ?? [];
  const pics = summary?.picsToday ?? [];

  return (
    <main className="app-shell">
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label="Buka menu navigasi"
        onClick={toggleMobileMenu}
      >
        ☰
      </button>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <Brand />
        <SidebarNavigation
          access={access}
          modules={session.modules}
          active="jadwalKaryawan"
          onNavigate={closeMobileMenu}
        />
        <SidebarFooter
          name={session.user.name}
          roleLabel={session.role?.label ?? session.user.role}
          onLogout={() => {
            void logout();
          }}
        />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Jadwal Karyawan & PIC</h1>
            <span className="section-kicker">{formatTanggal(selectedDate)}</span>
          </div>
          <div className="top-actions">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-button"
            />
            {canManage ? (
              <>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => {
                    setShowScheduleForm(true);
                    setShowPicForm(false);
                    setShowEmployeeForm(false);
                  }}
                >
                  + Atur Jadwal
                </button>
                <button
                  type="button"
                  className="settings-button"
                  onClick={() => {
                    setShowPicForm(true);
                    setShowScheduleForm(false);
                    setShowEmployeeForm(false);
                  }}
                >
                  + Assign PIC
                </button>
              </>
            ) : null}
          </div>
        </header>

        {notice ? (
          <p className="complaint-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {/* Stat Cards */}
        <div className="metric-grid">
          <div className="metric-card metric-green">
            <div className="metric-heading">
              <div className="metric-icon">👥</div>
            </div>
            <p>Total Terjadwal</p>
            <div className="metric-value">
              <strong>{summary?.totalScheduled ?? 0}</strong>
              <span>karyawan</span>
            </div>
          </div>
          {(summary?.shiftCounts ?? []).map((shift, index) => (
            <div
              className={`metric-card ${
                ["metric-blue", "metric-orange", "metric-green"][index % 3]
              }`}
              key={shift.key}
            >
              <div className="metric-heading">
                <div className="metric-icon">
                  {["☀️", "🌙", "🕒"][index % 3]}
                </div>
              </div>
              <p>{shift.label} Aktif</p>
              <div className="metric-value">
                <strong>{shift.count}</strong>
                <span>orang</span>
              </div>
              <small>{shift.time}</small>
            </div>
          ))}
          <div className="metric-card metric-red">
            <div className="metric-heading">
              <div className="metric-icon">✗</div>
            </div>
            <p>Tidak Hadir</p>
            <div className="metric-value">
              <strong>{summary?.absent ?? 0}</strong>
              <span>orang</span>
            </div>
          </div>
          <div className="metric-card metric-purple">
            <div className="metric-heading">
              <div className="metric-icon">📋</div>
            </div>
            <p>PIC Hari Ini</p>
            <div className="metric-value">
              <strong>{pics.length}</strong>
              <span>area</span>
            </div>
          </div>
        </div>

        {/* PIC Section */}
        {pics.length > 0 ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>PIC Hari Ini</h2>
            </div>
            <div className="jadwal-pic-grid">
              {pics.map((pic) => (
                <div key={pic.id} className="jadwal-pic-card">
                  <strong>{pic.employeeName}</strong>
                  <p>{pic.employeePosition}</p>
                  <span className="jadwal-pic-badge">{pic.area}</span>
                  {pic.task ? <p className="jadwal-pic-task">{pic.task}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Schedule Form */}
        {canManage && showScheduleForm ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Atur Jadwal</h2>
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
              >
                Tutup
              </button>
            </div>
            <div className="complaint-form">
              <label>
                <span>Karyawan</span>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                >
                  <option value="">Pilih karyawan…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.position}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Shift</span>
                <select
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value as ShiftKey)}
                >
                  {shifts.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label} ({s.time})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                >
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {getStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Catatan</span>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Opsional"
                />
              </label>
              <button
                type="button"
                className="complaint-btn complaint-btn-primary"
                disabled={busy}
                onClick={() => void handleCreateSchedule()}
              >
                Simpan Jadwal
              </button>
            </div>
          </section>
        ) : null}

        {/* PIC Form */}
        {canManage && showPicForm ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Assign PIC</h2>
              <button
                type="button"
                onClick={() => setShowPicForm(false)}
              >
                Tutup
              </button>
            </div>
            <div className="complaint-form">
              <label>
                <span>Karyawan</span>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                >
                  <option value="">Pilih karyawan…</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.position}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Area</span>
                <select
                  value={formPicArea}
                  onChange={(e) => setFormPicArea(e.target.value as PicArea)}
                >
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tugas</span>
                <input
                  type="text"
                  value={formPicTask}
                  onChange={(e) => setFormPicTask(e.target.value)}
                  placeholder="Deskripsi tugas (opsional)"
                />
              </label>
              <button
                type="button"
                className="complaint-btn complaint-btn-primary"
                disabled={busy}
                onClick={() => void handleAssignPic()}
              >
                Assign PIC
              </button>
            </div>
          </section>
        ) : null}

        {/* Schedule Table */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Jadwal Hari Ini</h2>
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  setShowEmployeeForm(true);
                  setShowScheduleForm(false);
                  setShowPicForm(false);
                }}
              >
                + Karyawan Baru
              </button>
            ) : null}
          </div>

          {canManage && showEmployeeForm ? (
            <div className="complaint-form">
              <label>
                <span>Nama</span>
                <input
                  type="text"
                  value={formEmpName}
                  onChange={(e) => setFormEmpName(e.target.value)}
                  placeholder="Nama karyawan"
                />
              </label>
              <label>
                <span>Posisi</span>
                <input
                  type="text"
                  value={formEmpPosition}
                  onChange={(e) => setFormEmpPosition(e.target.value)}
                  placeholder="Jabatan / posisi"
                />
              </label>
              <label>
                <span>Area</span>
                <select
                  value={formEmpArea}
                  onChange={(e) => setFormEmpArea(e.target.value)}
                >
                  <option value="">Pilih area…</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="complaint-btn complaint-btn-primary"
                disabled={busy}
                onClick={() => void handleCreateEmployee()}
              >
                Tambah Karyawan
              </button>
            </div>
          ) : null}

          {loading ? (
            <p className="complaint-empty">Memuat…</p>
          ) : schedules.length === 0 ? (
            <p className="complaint-empty">Belum ada jadwal untuk tanggal ini.</p>
          ) : (
            <table className="jadwal-schedule-table">
              <thead>
                <tr>
                  <th>Nama Karyawan</th>
                  <th>Posisi</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Area / Tugas</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sch) => {
                  const picForThis = pics.find((p) => p.employeeId === sch.employeeId);
                  const areaText = picForThis
                    ? `${picForThis.area}${picForThis.task ? ` — ${picForThis.task}` : ""}`
                    : sch.employeePosition;

                  return (
                    <tr key={sch.id}>
                      <td>
                        <strong>{sch.employeeName}</strong>
                      </td>
                      <td className="jadwal-col-muted">
                        {sch.employeePosition}
                      </td>
                      <td>
                        {getShiftLabel(sch.shift, shifts)}
                        <br />
                        <small>{getShiftTime(sch.shift, shifts)}</small>
                      </td>
                      <td>
                        <span className={getStatusClass(sch.status)}>
                          {getStatusLabel(sch.status)}
                        </span>
                      </td>
                      <td className="jadwal-col-muted">{areaText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </section>
    </main>
  );
}
