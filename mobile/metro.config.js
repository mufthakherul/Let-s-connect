const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing shared API layer from the web workspace.
config.watchFolders = [path.resolve(__dirname, '../frontend')];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../frontend/node_modules')
];

module.exports = config;
