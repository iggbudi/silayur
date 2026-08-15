"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SessionGate } from "../components/session-gate";
import { fetchRemoteConfig } from "../lib/config-api";
import { todayIsoDate } from "../../shared/date";
import {
  complaintHistory,
  createComplaint,
  listComplaints,
  updateComplaintStatus,
  type Complaint,
  type ComplaintHistoryEntry,
  type ComplaintPriority,
  type ComplaintStatus,
} from "../features/complaints";

const statusLabel: Record<ComplaintStatus, string> = {
  open: "Baru",
  assigned: "Ditugaskan",
  processing: "Diproses",
  resolved: "Selesai",
  reopened: "Dibuka lagi",
};

/** Status berikutnya dalam alur (untuk tombol lanjut). */
const NEXT_STATUS: Partial<Record<ComplaintStatus, ComplaintStatus>> = {
  open: "assigned",
  assigned: "processing",
  processing: "resolved",
  reopened: "assigned",
};

const numberFormat = new Intl.NumberFormat("id-ID");

export default function ComplaintsPage() {
  const { session, ready: authReady } = useSession();
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
  } = useMobileSidebar();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [history, setHistory] = useState<ComplaintHistoryEntry[]>([]);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<ComplaintPriority>("medium");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const date = todayIsoDate();
    const [list, config] = await Promise.all([
      listComplaints(date),
      fetchRemoteConfig(),
    ]);
    setComplaints(list.complaints);
    setOpenCount(list.openCount);
    setCategories(
      config.configItems.facilities
        .filter((item) => item.active)
        .map((item) => item.name),
    );
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadData();
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
  }, [authReady, session, loadData]);

  async function handleCreate() {
    setError("");
    setNotice("");
    if (!title.trim()) {
      setError("Judul komplain wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      await createComplaint({
        title: title.trim(),
        description: description.trim(),
        category: category || undefined,
        priority,
      });
      setTitle("");
      setDescription("");
      setCategory("");
      setPriority("medium");
      setNotice("Komplain berhasil dicatat.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance(complaint: Complaint) {
    const next = NEXT_STATUS[complaint.status];
    if (!next) return;
    setError("");
    setNotice("");
    try {
      await updateComplaintStatus(complaint.id, next);
      setNotice(`Status diubah menjadi ${statusLabel[next]}.`);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mengubah status.");
    }
  }

  async function handleShowHistory(complaintId: string) {
    setError("");
    setHistoryLoading(true);
    try {
      const entries = await complaintHistory(complaintId);
      setHistory(entries);
      setHistoryFor(complaintId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat riwayat.");
    } finally {
      setHistoryLoading(false);
    }
  }

  if (!authReady) return <SessionGate title="Memuat komplain…" />;
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }
  const access = session.access;
  const canViewComplaints =
    access.complaints === "view" || access.complaints === "manage";
  const canManageComplaints = access.complaints === "manage";

  if (!canViewComplaints) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat komplain.</p>
        </div>
      </main>
    );
  }

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
          active="complaints"
          onNavigate={closeMobileMenu}
        />
        <div className="sidebar-footer">
          <div className="sidebar-avatar" aria-hidden="true">
            {session.user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="sidebar-user">
            <span className="sidebar-name">{session.user.name}</span>
            <span className="sidebar-role">{session.user.role}</span>
          </div>
        </div>
      </aside>

      <section className="workspace complaint-workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Komplain</h1>
            <span className="section-kicker">
              {numberFormat.format(openCount)} komplain terbuka
            </span>
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

        {/* 1. Form tambah komplain */}
        {canManageComplaints ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Catat komplain</h2>
            </div>
            <form
              className="complaint-form"
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreate();
              }}
            >
              <label>
                <span>Judul</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ringkasan keluhan"
                  required
                />
              </label>
              <label>
                <span>Kategori</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Pilih kategori…</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Prioritas</span>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as ComplaintPriority)
                  }
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                </select>
              </label>
              <label>
                <span>Keterangan</span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail opsional"
                />
              </label>
              <button
                type="submit"
                className="complaint-btn complaint-btn-primary"
                disabled={busy}
              >
                Catat komplain
              </button>
            </form>
          </section>
        ) : null}

        {/* 2. Daftar komplain hari ini */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Komplain hari ini</h2>
          </div>
          {loading ? <p className="complaint-empty">Memuat…</p> : null}
          {complaints.length === 0 ? (
            <p className="complaint-empty">Belum ada komplain hari ini.</p>
          ) : (
            <ul className="complaint-list">
              {complaints.map((complaint) => (
                <li key={complaint.id}>
                  <div className="complaint-row">
                    <div>
                      <strong>{complaint.title}</strong>
                      <small>
                        {complaint.category || "Tanpa kategori"} · oleh{" "}
                        {complaint.reportedByName ?? complaint.reportedBy} ·{" "}
                        {new Date(complaint.reportedAt).toLocaleTimeString(
                          "id-ID",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </small>
                      {complaint.description ? (
                        <p className="complaint-desc">{complaint.description}</p>
                      ) : null}
                    </div>
                    <div className="complaint-actions">
                      <span
                        className={`complaint-status complaint-status-${complaint.status}`}
                      >
                        {statusLabel[complaint.status]}
                      </span>
                      <span className="complaint-priority">
                        {complaint.priority === "high"
                          ? "Prioritas tinggi"
                          : complaint.priority === "low"
                            ? "Prioritas rendah"
                            : "Prioritas sedang"}
                      </span>
                      {canManageComplaints && NEXT_STATUS[complaint.status] ? (
                        <button
                          type="button"
                          className="complaint-btn complaint-btn-ghost"
                          onClick={() => void handleAdvance(complaint)}
                        >
                          Lanjut ke {statusLabel[NEXT_STATUS[complaint.status]!]}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="complaint-btn complaint-btn-ghost"
                        onClick={() => void handleShowHistory(complaint.id)}
                      >
                        Riwayat
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 3. Riwayat transisi status */}
        {historyFor ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Riwayat status</h2>
              <span className="section-kicker">Perubahan status komplain</span>
            </div>
            {historyLoading ? (
              <p className="complaint-empty">Memuat…</p>
            ) : history.length === 0 ? (
              <p className="complaint-empty">Belum ada riwayat.</p>
            ) : (
              <ul className="complaint-history">
                {history.map((entry) => (
                  <li key={entry.id} className="complaint-history-row">
                    <time>
                      {new Date(entry.changedAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <span>
                      {entry.fromStatus
                        ? `${statusLabel[entry.fromStatus]} → ${statusLabel[entry.toStatus]}`
                        : `Dibuat (${statusLabel[entry.toStatus]})`}
                    </span>
                    <small>
                      {entry.changedByName ?? entry.changedBy}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
