const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");
const globals = require("globals");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...compat.extends("expo"),
  {
    ignores: ["dist/*", "rootStore.example.ts", "nativewind-env.d.ts"],
  },
  {
    rules: {
      "import/first": "off",
    },
  },
];
