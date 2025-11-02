const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'cjs', 'json'];

// // Increase transformer worker count
// config.transformer = {
//   ...config.transformer,
//   minifierConfig: {
//     keep_classnames: true,
//     keep_fnames: true,
//     mangle: {
//       keep_classnames: true,
//       keep_fnames: true,
//     },
//   },
// };

// // Optimize bundling
// config.maxWorkers = 2;

module.exports = withNativeWind(config, { input: "./global.css" });