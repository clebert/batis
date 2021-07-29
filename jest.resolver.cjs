module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch {
    return options.defaultResolver(request.replace(/\.js$/, '.ts'), options);
  }
};
