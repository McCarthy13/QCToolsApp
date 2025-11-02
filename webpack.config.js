const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add Tailwind CSS processing for web builds
  const cssRule = config.module.rules.find(rule =>
    rule.oneOf && rule.oneOf.some(r => r.test && r.test.toString().includes('css'))
  );

  if (cssRule && cssRule.oneOf) {
    cssRule.oneOf.forEach(rule => {
      if (rule.use && Array.isArray(rule.use)) {
        rule.use.forEach(loader => {
          if (loader.loader && loader.loader.includes('postcss-loader')) {
            if (!loader.options) loader.options = {};
            if (!loader.options.postcssOptions) loader.options.postcssOptions = {};
            loader.options.postcssOptions.plugins = [
              require('tailwindcss'),
              require('autoprefixer'),
            ];
          }
        });
      }
    });
  }

  return config;
};
