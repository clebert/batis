// @ts-check

const plugins = require('@onecmd/standard-plugins');
const nodeVersion = '16';

module.exports = [
  plugins.babel(),
  plugins.editorconfig(),
  plugins.eslint(),
  plugins.git(),
  plugins.github({branches: ['master'], nodeVersion}),
  plugins.jest({coverage: true}),
  plugins.node(nodeVersion),
  plugins.npm(),
  plugins.prettier(),
  plugins.typescript('node', 'package'),
  plugins.vscode({showFilesInEditor: false}),
];
