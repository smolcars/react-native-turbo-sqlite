/// <reference lib="webworker" />

const wasmUrl = new URL("../vendor/sqlite-wasm/sqlite3.wasm", import.meta.url);
const sqliteAssetBaseUrl = new URL(".", wasmUrl);
const proxyUri = new URL(
  "../vendor/sqlite-wasm/sqlite3-opfs-async-proxy.js",
  import.meta.url
);

(
  globalThis as typeof globalThis & { __RNTurboSqliteWorkerModule?: unknown }
).__RNTurboSqliteWorkerModule = {
  proxyUri: proxyUri.toString(),
  sqlite3Dir: sqliteAssetBaseUrl.toString(),
  locateFile(path: string) {
    if (path === "sqlite3.wasm") {
      return wasmUrl.toString();
    }

    return new URL(path.replace(/^\.\//, ""), sqliteAssetBaseUrl).toString();
  },
};

import("../vendor/sqlite-wasm/sqlite3-worker1.mjs").catch((error: unknown) => {
  setTimeout(() => {
    throw error;
  });
});

export {};
