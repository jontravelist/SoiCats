// Metro config for the monorepo: tells Metro to watch the workspace root
// (so changes to packages/shared/* hot-reload), and to look in both the
// app-local node_modules and the hoisted root node_modules for packages.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force a single copy of React/React Native (otherwise Metro can find two
// when packages/shared resolves a sibling node_modules).
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
