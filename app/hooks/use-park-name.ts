"use client";

import { useEffect, useState } from "react";
import { fetchParkName } from "../lib/config-api";
import { DEFAULT_PARK_NAME } from "../../shared/config";

/**
 * Mengambil nama tampilan tempat wisata dari endpoint publik `/api/config/identity`.
 * Fallback ke `DEFAULT_PARK_NAME` bila belum diatur atau gagal dimuat.
 */
export function useParkName(): string {
  const [name, setName] = useState(DEFAULT_PARK_NAME);

  useEffect(() => {
    let cancelled = false;
    fetchParkName()
      .then((value) => {
        if (!cancelled) setName(value);
      })
      .catch(() => {
        if (!cancelled) setName(DEFAULT_PARK_NAME);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return name;
}
