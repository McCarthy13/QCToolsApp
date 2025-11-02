module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  ignorePatterns: [
    "/dist/*",
    "/web-build/**/*",
    "rootStore.example.ts",
    "nativewind-env.d.ts",
    "*.sh",
  ],
  rules: {
    "prettier/prettier": "error",
    "import/first": "off",
  },
};
