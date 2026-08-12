const path = require("path");
const pak = require("../package.json");

module.exports = function (api) {
  const isMetro = api.caller((caller) => Boolean(caller?.platform));

  return {
    presets: ["module:@react-native/babel-preset"],
    plugins: isMetro
      ? [
          [
            "module-resolver",
            {
              extensions: [".tsx", ".ts", ".js", ".json"],
              alias: {
                [pak.name]: path.join(__dirname, "..", "src", "index"),
              },
            },
          ],
        ]
      : [],
  };
};
