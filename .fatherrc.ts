import { defineConfig } from "father";

export default defineConfig({
  esm: { input: "src" },
  cjs: { input: "src" },
  // umd: {
  //   name: "swrPromise",
  //   entry: "src/index.ts",
  // },
});
