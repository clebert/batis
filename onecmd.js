// @ts-check

const std = require('@onecmd/standard-plugins');
const nodeVersion = '16';

/** @type {readonly import('onecmd').Plugin[]} */
const plugins = [
  std.babel(),
  std.editorconfig(),
  std.eslint(),
  std.git(),
  std.github({branches: ['master'], nodeVersion}),
  std.jest({coverage: true}),
  std.node(nodeVersion),
  std.npm(),
  std.prettier(),
  std.typescript('node', 'package'),
  std.vscode({showFilesInEditor: false}),
];

module.exports = plugins;
