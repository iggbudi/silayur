import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".vinext/**",
      "dist/**",
      "node_modules/**",
      "out/**",
      "work/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // --------------------------------------------------------------------------
  // Slice boundary enforcement (Fase 2)
  // --------------------------------------------------------------------------
  // File di app/api/ TIDAK BOLEH import langsung dari internal slice.
  // Harus import via "@/slices/<nama>" atau relative ke slice index.
  //
  // Saat ini hanya warning (bukan error) untuk adopsi bertahap.
  // Naikkan ke "error" setelah semua migrasi import selesai.
  // --------------------------------------------------------------------------
  {
    files: ["app/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "db/auth-repo",
              message:
                "Import via slice public API: '@/slices/auth'. Lihat app/slices/MANIFEST.md.",
            },
            {
              name: "db/config-repo",
              message:
                "Import via slice public API: '@/slices/settings'. Lihat app/slices/MANIFEST.md.",
            },
            {
              name: "db/ticket-repo",
              message:
                "Import via slice public API: '@/slices/ticket-master'. Lihat app/slices/MANIFEST.md.",
            },
            {
              name: "shared/password.mjs",
              message:
                "Import via slice public API: '@/slices/auth'. Lihat app/slices/MANIFEST.md.",
            },
            {
              name: "shared/access",
              message:
                "Import via slice public API: '@/slices/rbac'. Lihat app/slices/MANIFEST.md.",
            },
            {
              name: "shared/config",
              message:
                "Import via slice public API: '@/slices/<nama>'. Lihat app/slices/MANIFEST.md.",
            },
          ],
        },
      ],
      // Fallback: rule tambahan yang match relative path imports ke internal slice.
      // ESLint no-restricted-imports kadang tidak match relative path dengan benar.
      // Pattern ini EXCLUDE file infrastruktur: db/get-db, db/http, db/schema,
      // db/index, db/client, db/client-web, db/env, db/runtime-env, db/seed-data, dll.
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "ImportDeclaration[source.value=/^(\\.\\.\\/)+(db\\/(auth-repo|config-repo|ticket-repo)|shared\\/(password|config|access))(\\.|$|\\/)/]",
          message:
            "Import via slice public API: '@/slices/<nama>'. Lihat app/slices/MANIFEST.md.",
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // Feature boundary enforcement (Fase 4)
  // --------------------------------------------------------------------------
  // File di LUAR app/features/<nama>/ TIDAK BOLEH import langsung ke internal
  // file di dalam feature (e.g. features/ticket-sales/repo.ts).
  // Harus import via "@/features/<nama>" atau relative ke index.ts.
  //
  // File DI DALAM app/features/<nama>/ boleh import internal feature manapun
  // (slice internal cohesion).
  //
  // Saat ini hanya warning. Naikkan ke error setelah slicing established.
  // --------------------------------------------------------------------------
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/features/**/*"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "ImportDeclaration[source.value=/features\\/(ticket-sales|visitor-checkin|cashier-report|complaint-handler)\\/(repo|server|api|types|validation|constants|components)(\\/|$|\\.)/]",
          message:
            "Import via feature public API: '@/features/<nama>'. Lihat app/features/README.md.",
        },
      ],
    },
  },
);

