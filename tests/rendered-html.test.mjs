import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the SILAYUR dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>SILAYUR — Dashboard Operasional<\/title>/i);
  assert.match(html, /Dashboard Operasional/);
  assert.match(html, /Pengunjung hari ini/);
  assert.match(html, /href="\/pengaturan"/);
});

test("server-renders the settings route", async () => {
  const response = await render("/pengaturan");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Pengaturan Operasional/);
  assert.match(html, /Pengguna &amp; role/);
  assert.match(html, /Checkpoint 5/);
});

test("defines persistent users with one assigned role", async () => {
  const [settingsPage, users] = await Promise.all([
    readFile(
      new URL("../app/pengaturan/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/lib/user-config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(settingsPage, /Tambah pengguna/);
  assert.match(settingsPage, /Edit pengguna/);
  assert.match(settingsPage, /Akses turunan/);
  assert.match(settingsPage, /Minimal satu Super Admin harus tetap aktif/);

  assert.match(users, /silayur\.users\.v1/);
  assert.match(users, /role: RoleKey/);
  assert.match(users, /username/);
  assert.match(users, /saveUsers/);
});

test("defines persistent access levels for every role and module", async () => {
  const [settingsPage, permissions] = await Promise.all([
    readFile(
      new URL("../app/pengaturan/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/lib/role-permissions.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(settingsPage, /Akses Modul per Role/);
  assert.match(settingsPage, /Tidak ada/);
  assert.match(settingsPage, /Lihat/);
  assert.match(settingsPage, /Kelola/);
  assert.match(settingsPage, /selectedRole === "super_admin"/);

  assert.match(permissions, /silayur\.role-permissions\.v1/);
  assert.match(permissions, /result\.super_admin = \{ \.\.\.fullAccess \}/);

  for (const role of [
    "super_admin",
    "manager",
    "supervisor",
    "ticket_officer",
    "finance_officer",
    "field_officer",
    "customer_service",
    "viewer",
  ]) {
    assert.match(permissions, new RegExp(`\\b${role}\\b`));
  }

  for (const moduleKey of [
    "dashboard",
    "operations",
    "visitors",
    "finance",
    "facilities",
    "complaints",
    "reports",
    "settings",
  ]) {
    assert.match(permissions, new RegExp(`\\b${moduleKey}\\b`));
  }
});
