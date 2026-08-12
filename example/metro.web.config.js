const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const fs = require("fs");
const path = require("node:path");
const escape = require("escape-string-regexp");
const pack = require("../package.json");

const root = path.resolve(__dirname, "..");
const metroWebRoute = "/metro-web";
const metroWebHtmlPath = path.resolve(__dirname, "index.metro.html");
const publicRoot = path.resolve(__dirname, "public");
const packageVendorRoot = path.resolve(root, "src", "vendor");
const packageRuntimeRoot = path.resolve(root, "src", "sqlite-wasm-helpers");
const modules = Object.keys({ ...pack.peerDependencies });
const rnwPath = fs.realpathSync(
  path.resolve(require.resolve("react-native-windows/package.json"), "..")
);
const escapePathForRegex = (filePath) =>
  filePath
    .split(/[/\\]+/)
    .map(escape)
    .join(String.raw`[/\\]`);
const baseConfig = getDefaultConfig(__dirname);
const resolverAssetExts = Array.from(
  new Set([...(baseConfig.resolver?.assetExts ?? []), "wasm"])
);
const resolverPlatforms = Array.from(
  new Set([...(baseConfig.resolver?.platforms ?? []), "web", "windows"])
);
const existingBlockList = Array.isArray(baseConfig.resolver?.blockList)
  ? baseConfig.resolver.blockList
  : baseConfig.resolver?.blockList
    ? [baseConfig.resolver.blockList]
    : [];
const defaultResolveRequest =
  baseConfig.resolver?.resolveRequest ??
  ((context, moduleName, platform) =>
    context.resolveRequest(context, moduleName, platform));
const getContentType = (filePath) => {
  switch (path.extname(filePath).toLowerCase()) {
    case ".js":
    case ".mjs":
      return "application/javascript; charset=UTF-8";
    case ".wasm":
      return "application/wasm";
    default:
      return "application/octet-stream";
  }
};
const isPathWithinRoot = (rootPath, filePath) => {
  const relativePath = path.relative(rootPath, filePath);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
};
const getSafePath = (rootPath, ...segments) => {
  const filePath = path.resolve(rootPath, ...segments);
  return isPathWithinRoot(rootPath, filePath) ? filePath : null;
};
const getVendorRequestPath = (requestPath) => {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const normalizedPath = decodedPath.replace(/\\/g, "/");
  if (!normalizedPath.startsWith("/vendor/")) {
    return null;
  }

  const relativePath = normalizedPath.replace(/^\/+/, "");
  const segments = relativePath.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  return relativePath;
};
const getCliArgValue = (name) => {
  const inlineArg = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inlineArg) {
    return inlineArg.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};
const metroWebPort =
  getCliArgValue("--port") ?? process.env.RCT_METRO_PORT ?? "8081";

console.log(
  `Metro web example available at http://localhost:${metroWebPort}${metroWebRoute}`
);

const config = {
  watchFolders: [root],

  resolver: {
    assetExts: resolverAssetExts,
    platforms: resolverPlatforms,
    blockList: [
      ...existingBlockList,
      ...modules.map(
        (m) =>
          new RegExp(
            `^${escapePathForRegex(path.join(root, "node_modules", m))}(?:[/\\\\].*)?$`
          )
      ),
      new RegExp(
        `^${escapePathForRegex(path.resolve(__dirname, "windows"))}(?:[/\\\\].*)?$`
      ),
      new RegExp(
        `^${escapePathForRegex(path.join(rnwPath, "build"))}(?:[/\\\\].*)?$`
      ),
      new RegExp(
        `^${escapePathForRegex(path.join(rnwPath, "target"))}(?:[/\\\\].*)?$`
      ),
      /.*\.ProjectImports\.zip/,
    ],

    extraNodeModules: {
      ...modules.reduce((acc, name) => {
        acc[name] = path.join(__dirname, "node_modules", name);
        return acc;
      }, {}),
      [pack.name]: root,
      "react-native-windows": rnwPath,
    },

    resolveRequest: (context, moduleName, platform) => {
      if (platform === "web" && moduleName === "react-native") {
        return defaultResolveRequest(context, "react-native-web", platform);
      }

      if (platform === "windows") {
        if (moduleName === "react-native") {
          return defaultResolveRequest(
            context,
            "react-native-windows",
            platform
          );
        }

        if (moduleName.startsWith("react-native/")) {
          const windowsModuleName = `react-native-windows/${moduleName.slice(
            "react-native/".length
          )}`;

          try {
            return defaultResolveRequest(context, windowsModuleName, platform);
          } catch (error) {
            // Fall through to stock React Native when RNW does not override a file.
          }
        }
      }

      return defaultResolveRequest(context, moduleName, platform);
    },
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: { experimentalImportSupport: false, inlineRequires: true },
    }),
  },

  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

        const requestPath = req.url?.split("?")[0];
        if (requestPath?.startsWith("/vendor/")) {
          const relativePath = getVendorRequestPath(requestPath);
          if (!relativePath) {
            res.statusCode = 400;
            res.end("Invalid vendor asset path");
            return;
          }

          const candidatePaths = [
            getSafePath(publicRoot, relativePath),
            getSafePath(
              packageVendorRoot,
              relativePath.replace(/^vendor[/\\]/, "")
            ),
          ];

          if (
            relativePath === "vendor/sqlite-wasm/sqlite3-worker.metro-web.js"
          ) {
            candidatePaths.push(
              getSafePath(packageRuntimeRoot, "sqlite3-worker.metro-web.js")
            );
          }

          for (const filePath of candidatePaths) {
            if (filePath && fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              if (!stat.isFile()) {
                continue;
              }

              res.setHeader("Content-Type", getContentType(filePath));
              res.end(fs.readFileSync(filePath));
              return;
            }
          }
        }

        if (
          requestPath === metroWebRoute ||
          requestPath === `${metroWebRoute}/`
        ) {
          res.setHeader("Content-Type", "text/html; charset=UTF-8");
          res.end(fs.readFileSync(metroWebHtmlPath));
          return;
        }

        return middleware(req, res, next);
      };
    },
  },
};

module.exports = mergeConfig(baseConfig, config);
