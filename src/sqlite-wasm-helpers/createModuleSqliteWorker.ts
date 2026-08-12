/// <reference lib="dom" />

import type { WorkerHandle } from "./sqlite3Worker1Promiser";

export function createModuleSqliteWorker(): WorkerHandle {
  return {
    worker: new Worker(new URL("./sqlite3-worker.bootstrap", import.meta.url), {
      type: "module",
    }),
  };
}
