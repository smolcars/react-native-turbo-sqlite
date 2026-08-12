/// <reference lib="dom" />

import type { WorkerHandle } from "./sqlite3Worker1Promiser";

type RuntimeGlobals = typeof globalThis & {
  __RNTurboSqliteAssetBaseUrl?: string;
  __RNTurboSqliteWorkerUrl?: string;
};

function normalizeAssetBaseUrl(assetBaseUrl: string) {
  return assetBaseUrl.endsWith("/") ? assetBaseUrl : `${assetBaseUrl}/`;
}

function getAssetBaseUrl() {
  const configured = (globalThis as RuntimeGlobals).__RNTurboSqliteAssetBaseUrl;
  return normalizeAssetBaseUrl(configured ?? "/vendor/sqlite-wasm/");
}

function getWorkerUrl() {
  const configured = (globalThis as RuntimeGlobals).__RNTurboSqliteWorkerUrl;
  return configured ?? `${getAssetBaseUrl()}sqlite3-worker.metro-web.js`;
}

export function createUrlSqliteWorker(): WorkerHandle {
  return {
    worker: new Worker(getWorkerUrl()),
  };
}
