import { rmSync } from "node:fs";

export function cleanupTempDirectory(directory) {
  try {
    rmSync(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  } catch (error) {
    if (error?.code !== "EPERM") throw error;
  }
}
