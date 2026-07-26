import assert from "node:assert/strict";
import test from "node:test";

const session = {
  ok: true,
  checkpoint: "9",
  user: {
    id: "admin-resepsionis",
    name: "Admin Resepsionis",
    username: "admin.resepsionis",
    role: "super_admin",
    active: true,
  },
  role: {
    key: "super_admin",
    label: "Super Admin",
    description: "Akses penuh",
    active: true,
    system: true,
  },
  access: {
    dashboard: "manage",
    operations: "manage",
    visitors: "manage",
    finance: "manage",
    facilities: "manage",
    complaints: "manage",
    reports: "manage",
    settings: "manage",
  },
  modules: {
    visitors: true,
    finance: true,
    operations: true,
    facilities: true,
    complaints: true,
  },
};

test("session bootstrap is reused across client navigations", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (input, init) => {
    requests += 1;
    if (init?.method === "POST") {
      return Response.json(
        String(input).endsWith("/api/auth/login") ? session : { ok: true },
      );
    }
    return Response.json(session);
  };

  try {
    const api = await import(
      `../config-api.ts?session-cache=${Date.now()}`
    );

    assert.equal(api.peekSession(), null);
    assert.deepEqual(await api.fetchSession(), session);
    assert.deepEqual(await api.fetchSession(), session);
    assert.equal(requests, 1, "cached navigation must not refetch the session");

    await api.fetchSession({ force: true });
    assert.equal(requests, 2, "explicit refresh must revalidate the session");

    await api.logoutRemote();
    assert.equal(api.peekSession(), null);

    await api.loginRemote("admin.resepsionis", "test-password");
    const requestsAfterLogin = requests;
    assert.deepEqual(await api.fetchSession(), session);
    assert.equal(
      requests,
      requestsAfterLogin,
      "successful login must prime navigation without another session request",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
