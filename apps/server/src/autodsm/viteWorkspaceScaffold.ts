// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as path from "node:path";

const VITE_CONFIG = `import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AutoDSM workspace</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div>AutoDSM workspace</div>
  </StrictMode>,
);
`;

function writeIfMissing(absPath: string, content: string): void {
  try {
    fs.accessSync(absPath);
  } catch {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content, "utf8");
  }
}

/** Ensure minimal Vite scaffold exists so design-system CLIs can run. */
export function ensureViteWorkspaceScaffold(cwd: string): void {
  const root = path.resolve(cwd);
  writeIfMissing(path.join(root, "vite.config.ts"), VITE_CONFIG);
  writeIfMissing(path.join(root, "tsconfig.json"), TSCONFIG);
  writeIfMissing(path.join(root, "index.html"), INDEX_HTML);
  writeIfMissing(path.join(root, "src/main.tsx"), MAIN_TSX);
}
