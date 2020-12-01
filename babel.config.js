module.exports = {
  presets: [['@babel/env', {targets: {node: '15'}}], '@babel/typescript'],
  plugins: [
    '@babel/proposal-nullish-coalescing-operator',
    '@babel/proposal-optional-chaining',
  ],
};
