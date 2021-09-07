// @ts-check

const plugins = require('@onecmd/standard-plugins');

module.exports = [
  plugins.babel(),
  plugins.editorconfig(),
  plugins.eslint(),
  plugins.git(),
  plugins.jest({coverage: true}),
  plugins.node('16'),
  plugins.npm(),
  plugins.prettier(),
  plugins.typescript('node', 'package'),
  plugins.vscode({showFilesInEditor: false}),
];
