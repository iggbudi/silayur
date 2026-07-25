import assert from "node:assert/strict";
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
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the three SILAYUR application routes", async () => {
  const [dashboard, settings, login] = await Promise.all([
    render("/"),
    render("/pengaturan"),
    render("/login"),
  ]);
  assert.equal(dashboard.status, 200);
  assert.equal(settings.status, 200);
  assert.equal(login.status, 200);

  const [dashboardHtml, settingsHtml, loginHtml] = await Promise.all([
    dashboard.text(),
    settings.text(),
    login.text(),
  ]);
  assert.match(dashboardHtml, /SILAYUR|Memuat sesi/i);
  assert.match(settingsHtml, /Pengaturan Operasional|Memuat sesi/i);
  assert.match(loginHtml, /Masuk ke sistem|Memeriksa sesi aman/i);
  assert.match(loginHtml, /Checkpoint 9/i);
  assert.doesNotMatch(loginHtml, /pilih pengguna aktif/i);
});
