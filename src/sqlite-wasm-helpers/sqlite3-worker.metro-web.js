/* eslint-env worker */

"use strict";

function normalizeAssetBaseUrl(assetBaseUrl) {
  return assetBaseUrl.endsWith("/") ? assetBaseUrl : `${assetBaseUrl}/`;
}

function getWorkerBaseUrl() {
  const href =
    (typeof self.location?.href === "string" && self.location.href) ||
    "/vendor/sqlite-wasm/sqlite3-worker.metro-web.js";

  return normalizeAssetBaseUrl(href.replace(/[^/?#]+(?:[?#].*)?$/, ""));
}

const assetBaseUrl = getWorkerBaseUrl();

self.__RNTurboSqliteWorkerModule = {
  proxyUri: `${assetBaseUrl}sqlite3-opfs-async-proxy.js`,
  sqlite3Dir: assetBaseUrl,
  locateFile(path) {
    if (path === "sqlite3.wasm") {
      return `${assetBaseUrl}sqlite3.wasm`;
    }

    return `${assetBaseUrl}${String(path).replace(/^\.\//, "")}`;
  },
};

importScripts(`${assetBaseUrl}sqlite3-worker1.mjs`);
