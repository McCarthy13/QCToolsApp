const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");
const globals = require("globals");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "web-build/**",
      ".expo/**",
      "dist/**",
      "build/**",
      ".firebase/**",
      "**/static/**",
      "**/*.map",
      "rootStore.example.ts",
      "nativewind-env.d.ts"
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...compat.extends("expo"),
  {
    rules: {
      "import/first": "off",
    },
  },
];
