# ADR 0001: Hybrid Layered + Co-located Architecture

- **Status**: Accepted & Implemented
- **Date**: 26 Juli 2026
- **Context**: Checkpoint 12 — refactor fondasi organisasi kode
- **Deciders**: Owner DIGITAMA
- **Implemented**: 26 Juli 2026 (commit `5737833` — akhir Fase 5)

## Context

DIGITAMA Dashboard adalah **edge-deployed modular monolith** (satu Cloudflare
Worker, satu database Turso, banyak domain: auth, settings, ticket-master,
dashboard, RBAC). Saat ini organisasi kode **dominan layered**:

```
app/
├── components/    ← SEMUA UI
├── hooks/         ← SEMUA hooks
├── lib/           ← SEMUA client helpers
└── api/           ← SEMUA API routes
db/
├── auth-repo.ts
├── config-repo.ts
└── ticket-repo.ts
```

Untuk mengubah **1 fitur** (misal: tambah field di tiket), developer harus
edit file di **5+ folder berbeda**:
1. `db/ticket-repo.ts` (data)
2. `app/api/config/route.ts` (route)
3. `app/lib/config-api.ts` (client)
4. `app/components/ticket-settings.tsx` (UI)
5. `shared/config.ts` (types)
6. `tests/config-api.test.mjs` (test di folder terpisah)

Trade-off layered:
- ✅ Familiar untuk developer Next.js / Express
- ✅ Struktur konsisten
- ❌ Fan-out tinggi per fitur
- ❌ Test terpisah dari source
- ❌ Tidak ada boundary antar domain

## Considered Options

### Opsi A: Pure Vertical Slicing (Bulletproof React style)
Refactor semua kode ke `app/features/<nama>/{components,api,repo,server,index.ts}/`.
- ✅ Isolasi fitur sempurna
- ❌ Big-bang refactor — risiko tinggi
- ❌ Tidak cocok untuk app kecil-menengah
- ❌ Banyak import path yang harus di-update

### Opsi B: Pure Layered (status quo)
Tetap seperti sekarang, no change.
- ✅ Zero effort
- ❌ Fan-out tinggi
- ❌ Co-location lemah
- ❌ Tidak scalable untuk fitur baru (transaksi penjualan)

### Opsi C: Hybrid — Layered + Co-located Tests + Boundary per Slice ✅
Pertahankan struktur layered existing, tambahkan:
1. **Co-locate tests** dengan source-nya (test folder di `__tests__/`)
2. **Public API boundary** per domain via `index.ts` di folder slice
3. **CSS variables extracted** ke `app/styles/tokens.css`
4. **Opsional `features/` folder** untuk fitur BARU yang self-contained
- ✅ Zero breaking change
- ✅ Backward-compatible
- ✅ Incremental — bisa di-rollback per fase
- ✅ Co-location benefit langsung
- ✅ Boundary enforcement via ESLint
- ✅ Skalabilitas untuk fitur baru

## Decision

**Opsi C: Hybrid Layered + Co-located** dengan rollout bertahap 5 fase:

| Fase | Scope | Risiko |
|---|---|---|
| 0 | Pondasi (docs, path alias) — **FASE INI** | 🟢 |
| 1 | Co-locate test files | 🟢 |
| 2 | Public API boundary + ESLint rule | 🟢 |
| 3 | Extract CSS tokens (variabel & base) | 🟡 |
| 4 | Scaffold `app/features/` untuk slice baru | 🟢 |
| 5 | Pilot slice baru (transaksi penjualan) | 🟡 |

**Prinsip**: setiap fase harus **independen, reversible, dan tidak break**
fitur existing. Tidak ada "big-bang refactor".

## Consequences

### Positive
- Code organization lebih sehat tanpa disrupt fitur existing
- Onboarding lebih mudah (docs jelas)
- Test co-located → faster feedback loop
- Public API per slice → prevent deep import
- Siap untuk fitur baru yang lebih besar (penjualan tiket, reporting)

### Negative
- 2 paradigma (layered + slice) hidup berdampingan — perlu penjelasan di docs
- Beberapa `index.ts` re-export yang "cuma re-export" (boilerplate minimal)
- ESLint rule harus di-maintain

### Neutral
- Tidak ada perubahan database schema
- Tidak ada perubahan runtime behavior
- Tidak ada dependency baru

## Rollback Plan

Setiap fase di-commit terpisah dengan pesan jelas. Untuk rollback:
- Fase 0: revert commit `chore(arch): foundation` (hapus `docs/`, `ARCHITECTURE.md`, revert `tsconfig.json`)
- Fase 1-5: `git revert <commit-hash>` per fase

## Hasil Implementasi (26 Juli 2026)

ADR ini diimplementasikan dalam 6 commit bertahap:

| Fase | Commit | Scope |
|---|---|---|
| 0 | `3386d3c` | Pondasi: `ARCHITECTURE.md`, `docs/folder-map.md`, ADR, path alias |
| 1 | `1f1552b` | Co-locate tests (3 test dipindah ke `__tests__/` sebelah source) |
| 2 | `23e9a23` | Public API boundary (6 slice di `app/slices/` + ESLint warning) |
| 3A | `e8c7c3a` | Extract CSS tokens & base ke `app/styles/` |
| 4 | `6b3cd7a` | Scaffold `app/features/` + ESLint boundary rule |
| 5 | `5737833` | Pilot slice `ticket-sales/` (15 file, 1089 baris) |

**Total**: 47 file, +2835 baris, 26/26 test pass.

**Validasi final**:
- `npm run type-check` hijau
- `npm run lint` 0 error (8 warning dari Fase 2 + 2 warning dari Fase 4 — sesuai desain)
- 4 test existing + 2 test baru ticket-sales = 6/6 pass

**Lessons learned**:
1. **Pendekatan inkremental berhasil** — tidak ada breaking change
2. **Public API per slice efektif** — boundary jelas, ESLint membantu
3. **Co-locate test meningkatkan DX** — test mudah ditemukan
4. **Vertical slice untuk fitur baru** — file existing tidak tersentuh
5. **Drizzle snapshot masih manual** — integration test penuh butuh snapshot generation

## References

- [Vertical Slice Architecture — Jimmy Bogard](https://jimmybogard.com/vertical-slice-architecture/)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [progress.md](../../progress.md)
