const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add DefinePlugin to inject environment variables
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.EXPO_PUBLIC_FIREBASE_API_KEY': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
      'process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
      'process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
      'process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
      'process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.EXPO_PUBLIC_FIREBASE_APP_ID': JSON.stringify(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
    })
  );

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
