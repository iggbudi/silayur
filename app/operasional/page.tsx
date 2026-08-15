"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SessionGate } from "../components/session-gate";
import { todayIsoDate } from "../../shared/date";
import {
  operationsStatus,
  setOperationsChecklist,
  type OperationsStatus,
} from "../features/operations";

const numberFormat = new Intl.NumberFormat("id-ID");

export default function OperationsPage() {
  const { session, ready: authReady } = useSession();
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
  } = useMobileSidebar();

  const [status, setStatus] = useState<OperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const data = await operationsStatus(todayIsoDate());
    setStatus(data);
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

  async function handleToggle(checklistId: string, done: boolean) {
    setError("");
    setNotice("");
    try {
      await setOperationsChecklist({
        checklistId,
        done,
        note: notes[checklistId] ?? "",
      });
      setNotes((prev) => ({ ...prev, [checklistId]: "" }));
      setNotice(done ? "Checklist ditandai selesai." : "Checklist dibatalkan.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan.");
    }
  }

  if (!authReady) return <SessionGate title="Memuat operasional…" />;
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }
  const access = session.access;
  const canViewOperations =
    access.operations === "view" || access.operations === "manage";
  const canManageOperations = access.operations === "manage";

  if (!canViewOperations) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat operasional.</p>
        </div>
      </main>
    );
  }

  const progress =
    status && status.totalCount > 0
      ? Math.round((status.doneCount / status.totalCount) * 100)
      : 0;

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
          active="operations"
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

      <section className="workspace operations-workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Operasional</h1>
            <span className="section-kicker">
              {status
                ? `${numberFormat.format(status.doneCount)} dari ${numberFormat.format(
                    status.totalCount,
                  )} checklist selesai`
                : "Checklist harian"}
            </span>
          </div>
        </header>

        {notice ? (
          <p className="operations-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="panel">
          <div className="panel-heading">
            <h2>Checklist buka dan tutup hari ini</h2>
            {status?.updatedAt ? (
              <span className="updated-label">
                Diperbarui{" "}
                {new Date(status.updatedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>

          {loading ? <p className="operations-empty">Memuat…</p> : null}
          {status && status.items.length === 0 ? (
            <p className="operations-empty">
              Belum ada item checklist. Tambahkan jadwal operasional di
              Pengaturan &gt; Jam operasional.
            </p>
          ) : null}

          {status && status.items.length > 0 ? (
            <div className="operations-progress" aria-label="Progress checklist">
              <div className="operations-progress-head">
                <span>Progress hari ini</span>
                <strong>
                  {numberFormat.format(status.doneCount)}/
                  {numberFormat.format(status.totalCount)}
                </strong>
              </div>
              <div className="operations-track">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          <div className="operations-list">
            {status?.items.map((item) => (
              <div
                key={item.checklistId}
                className={`operations-row ${item.done ? "operations-row-done" : ""}`}
              >
                <div className="operations-main">
                  <strong>{item.name}</strong>
                  {item.detail ? <small>{item.detail}</small> : null}
                  {item.note ? (
                    <small className="operations-note">“{item.note}”</small>
                  ) : null}
                </div>
                <span
                  className={`operations-status ${item.done ? "operations-status-done" : "operations-status-pending"}`}
                >
                  {item.done ? "Selesai" : "Belum"}
                </span>
                {canManageOperations ? (
                  <div className="operations-actions">
                    <input
                      type="text"
                      placeholder="Catatan (opsional)"
                      value={notes[item.checklistId] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [item.checklistId]: e.target.value,
                        }))
                      }
                    />
                    {item.done ? (
                      <button
                        type="button"
                        className="operations-btn operations-btn-danger"
                        onClick={() =>
                          void handleToggle(item.checklistId, false)
                        }
                      >
                        Batal
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="operations-btn operations-btn-primary"
                        onClick={() =>
                          void handleToggle(item.checklistId, true)
                        }
                      >
                        Selesai
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Jadwal operasional</h2>
            <span className="updated-label">
              Dikelola di Pengaturan &gt; Jam operasional
            </span>
          </div>
          {status && status.items.length === 0 ? (
            <p className="operations-empty">Belum ada jadwal terdaftar.</p>
          ) : (
            <div className="operations-schedule">
              {status?.items.map((item) => (
                <div key={item.checklistId}>
                  <strong>{item.name}</strong>
                  <span>{item.detail || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
