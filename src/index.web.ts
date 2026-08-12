/// <reference lib="dom" />

// URL-served web entry for Metro/Expo web and browser CommonJS consumers.
// Unlike the browser ESM entry, this path does not rely on module URL metadata.
import { createWebTurboSqlite } from "./createWebTurboSqlite";
import { createUrlSqliteWorker } from "./sqlite-wasm-helpers/createUrlSqliteWorker";
import { sqlite3Worker1Promiser } from "./sqlite-wasm-helpers/sqlite3Worker1Promiser";

export type { Spec } from "./NativeTurboSqlite";
export * from "./TurboSqliteTypes";

export default createWebTurboSqlite(() =>
  sqlite3Worker1Promiser({
    worker: createUrlSqliteWorker,
  })
);
