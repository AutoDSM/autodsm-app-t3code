import { defineConfig } from "tsdown";

const shared = {
  format: "cjs" as const,
  outDir: "dist-electron",
  sourcemap: true,
  outExtensions: () => ({ js: ".cjs" }),
};

const isDevBuild = process.env.T3CODE_DESKTOP_DEV_BUILD === "1";

export default defineConfig([
  {
    ...shared,
    entry: ["src/main.ts"],
    clean: !isDevBuild,
    noExternal: (id) => id.startsWith("@t3tools/"),
  },
  {
    ...shared,
    entry: ["src/preload.ts"],
  },
]);
