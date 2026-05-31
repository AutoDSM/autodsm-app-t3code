// @effect-diagnostics nodeBuiltinImport:off
import * as path from "node:path";

import type {
  ComponentPreviewExportKind,
  ComponentPreviewExportSpec,
  ComponentPreviewManifest,
  ComponentPreviewPropKind,
  ComponentPreviewPropSpec,
  ComponentPreviewPropsEntry,
} from "@t3tools/contracts";
import ts from "typescript";

import { ensureViteWorkspaceScaffold } from "../autodsm/viteWorkspaceScaffold.ts";

function getSourceFileModuleSymbol(sf: ts.SourceFile): ts.Symbol | undefined {
  return (sf as unknown as { symbol?: ts.Symbol }).symbol;
}

function exportKindForSymbol(sym: ts.Symbol, checker: ts.TypeChecker): ComponentPreviewExportKind {
  const decl = sym.declarations?.[0];
  if (!decl) return "unknown";
  if (ts.isClassDeclaration(decl)) return "class";

  const t = checker.getTypeOfSymbolAtLocation(sym, decl);
  const callSigs = t.getCallSignatures();
  if (callSigs.length === 0) return "unknown";

  const targetDecl = sym.declarations?.find((d) => ts.isFunctionLike(d)) ?? decl;

  if (ts.isVariableDeclaration(decl) && decl.initializer && ts.isCallExpression(decl.initializer)) {
    const expr = decl.initializer.expression;
    const text = expr.getText();
    if (text.endsWith("forwardRef") || text.includes("forwardRef")) return "forwardRef";
    if (text.endsWith("memo") || text.includes(".memo")) return "memo";
  }

  if (ts.isFunctionDeclaration(targetDecl) || ts.isFunctionExpression(targetDecl)) {
    return "function";
  }

  return "unknown";
}

function describePropType(
  type: ts.Type,
  checker: ts.TypeChecker,
): { kind: ComponentPreviewPropKind; enumValues?: readonly string[]; unsupportedReason?: string } {
  const nonNullable = type.getNonNullableType();

  if (nonNullable.flags & ts.TypeFlags.String) return { kind: "string" };
  if (nonNullable.flags & ts.TypeFlags.Number) return { kind: "number" };
  if (nonNullable.flags & ts.TypeFlags.Boolean || nonNullable.flags & ts.TypeFlags.BooleanLiteral) {
    return { kind: "boolean" };
  }

  if (nonNullable.isUnion()) {
    const literals = nonNullable.types.filter((u) => u.isStringLiteral()).map((u) => u.value);
    if (literals.length === nonNullable.types.length && literals.length > 0) {
      return literals.length <= 12
        ? { kind: "enum", enumValues: literals }
        : { kind: "literalUnion", enumValues: literals.slice(0, 24) };
    }
    return { kind: "unsupported", unsupportedReason: "Union type is not a string-literal union." };
  }

  const str = checker.typeToString(nonNullable);
  if (str.includes("ReactNode") || str.includes("React.ReactNode") || str.includes("JSX.Element")) {
    return { kind: "reactNode" };
  }

  if (nonNullable.getCallSignatures().length > 0) {
    return { kind: "function", unsupportedReason: "Callback prop — provide a stub in preview UI." };
  }

  if (
    checker.getIndexInfosOfType(nonNullable).length > 0 ||
    str.startsWith("{") ||
    str.includes("{")
  ) {
    return { kind: "object", unsupportedReason: "Edit as JSON in preview controls." };
  }

  if (str.endsWith("[]") || (str.includes("readonly ") && str.includes("[]"))) {
    return { kind: "array", unsupportedReason: "Edit as JSON array." };
  }

  return { kind: "unknown" };
}

function propsFromFirstParameter(
  fnLike: ts.SignatureDeclaration,
  checker: ts.TypeChecker,
): ComponentPreviewPropSpec[] {
  const param = fnLike.parameters[0];
  if (!param) return [];

  const type = checker.getTypeAtLocation(param);
  const apparent = checker.getApparentType(type);

  const props = apparent.getProperties().filter((sym) => {
    const name = sym.getName();
    if (name.startsWith("__")) return false;
    return name !== "key" && name !== "ref";
  });

  const specs: ComponentPreviewPropSpec[] = [];

  for (const sym of props) {
    const decl = sym.valueDeclaration ?? sym.declarations?.[0];
    if (!decl) continue;

    const optional = (sym.getFlags() & ts.SymbolFlags.Optional) !== 0;
    const pt = checker.getTypeOfSymbolAtLocation(sym, decl);
    const { kind, enumValues, unsupportedReason } = describePropType(pt, checker);

    specs.push({
      name: sym.getName(),
      kind,
      optional,
      ...(enumValues !== undefined ? { enumValues: [...enumValues] } : {}),
      ...(unsupportedReason !== undefined ? { unsupportedReason } : {}),
    });
  }

  return specs;
}

function propsForExportSymbol(sym: ts.Symbol, checker: ts.TypeChecker): ComponentPreviewPropSpec[] {
  const decl = sym.declarations?.[0];
  if (!decl) return [];

  if (ts.isFunctionDeclaration(decl) || ts.isFunctionExpression(decl)) {
    return propsFromFirstParameter(decl, checker);
  }

  if (ts.isVariableDeclaration(decl) && decl.initializer) {
    const init = decl.initializer;
    if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
      return propsFromFirstParameter(init, checker);
    }
    if (ts.isCallExpression(init)) {
      const t = checker.getTypeAtLocation(decl);
      const call = t.getCallSignatures()[0];
      if (call) {
        const ret = call.getReturnType();
        const inner = ret.getCallSignatures()[0];
        const innerDecl = inner?.getDeclaration();
        if (innerDecl !== undefined && ts.isParameter(innerDecl)) {
          const parameterDecl = innerDecl as ts.ParameterDeclaration;
          const fnLike = parameterDecl.parent;
          if (ts.isFunctionLike(fnLike)) {
            return propsFromFirstParameter(fnLike, checker);
          }
        }
      }
    }
  }

  return [];
}

function buildAnalyzerCompilerOptions(cwd: string): ts.CompilerOptions {
  // Scope the tsconfig lookup to the workspace root. ts.findConfigFile walks
  // upward, which can latch onto an unrelated ancestor (a stray monorepo
  // tsconfig, project references, mismatched rootDir) and silently break
  // single-file compilation — producing empty `exports`.
  const workspaceTsconfigPath = path.join(cwd, "tsconfig.json");
  const configPath = ts.sys.fileExists(workspaceTsconfigPath) ? workspaceTsconfigPath : undefined;

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: false,
    skipLibCheck: true,
    noEmit: true,
    allowJs: true,
    esModuleInterop: true,
  };

  if (configPath !== undefined) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (!configFile.error && configFile.config) {
      const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath),
      );
      Object.assign(compilerOptions, parsed.options);
      // Strip fields that derail single-file compilation when inherited from
      // the workspace tsconfig (composite/declaration emit, build-info paths,
      // and project references all assume a multi-file build graph we don't
      // have here).
      compilerOptions.noEmit = true;
      delete compilerOptions.composite;
      delete compilerOptions.declaration;
      delete compilerOptions.declarationMap;
      delete compilerOptions.outDir;
      delete compilerOptions.tsBuildInfoFile;
    }
  }

  return compilerOptions;
}

function extractManifestFromProgram(
  program: ts.Program,
  checker: ts.TypeChecker,
  baseDiagnostics: readonly string[],
  input: { readonly absolutePath: string; readonly relativePathPosix: string },
): ComponentPreviewManifest {
  const sf = program.getSourceFile(input.absolutePath);
  if (!sf) {
    return {
      relativePath: input.relativePathPosix,
      exports: [],
      propsByExport: [],
      diagnostics: [...baseDiagnostics, "Could not load source file."],
    };
  }

  const moduleSymbol = getSourceFileModuleSymbol(sf);
  if (!moduleSymbol) {
    return {
      relativePath: input.relativePathPosix,
      exports: [],
      propsByExport: [],
      diagnostics: [...baseDiagnostics, "Could not load module symbol."],
    };
  }

  const exportSpecs: ComponentPreviewExportSpec[] = [];
  const propsByExport: ComponentPreviewPropsEntry[] = [];

  const moduleExports = checker.getExportsOfModule(moduleSymbol);

  for (const exp of moduleExports) {
    const rawName = exp.getName();
    if (rawName.startsWith("__")) continue;

    const sym = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;

    // Skip type-only exports (`interface`, `type FooKind = ...`, `enum` declared
    // as type-only, etc.). They have no runtime value, so the bundler can't
    // import them. Without this filter, a file shaped like:
    //   export interface FooProps { ... }
    //   export function Foo(props: FooProps) { ... }
    // would expose BOTH names in the manifest, and `pickInitialExport` could
    // pick the interface — esbuild then strips the type-only import and the
    // preview ends up empty.
    if ((sym.flags & ts.SymbolFlags.Value) === 0) {
      continue;
    }

    const exportName = rawName === "default" ? "default" : rawName;

    const kind = exportKindForSymbol(sym, checker);
    exportSpecs.push({
      name: exportName,
      isDefault: exportName === "default",
      kind,
    });

    const props = propsForExportSymbol(sym, checker);
    propsByExport.push({ exportName, props });
  }

  return {
    relativePath: input.relativePathPosix,
    exports: exportSpecs,
    propsByExport,
    diagnostics: [...baseDiagnostics],
  };
}

/**
 * A workspace is "initialized" iff its root has a `package.json`. The
 * workspace-creation flow copies the template's package.json as the first
 * step (autodsmCreateWorkspace.ts ~line 221), so its presence is a reliable
 * signal that the cwd is a real workspace and not, e.g., a stale staging path
 * the frontend is still holding from a crashed creation flow.
 *
 * The analyzer used to call `ensureViteWorkspaceScaffold` unconditionally to
 * heal legacy workspaces, which had the side effect of materialising phantom
 * `<cwd>/{vite.config.ts,tsconfig.json,index.html,src/main.tsx}` files inside
 * `.staging/<id>/system/` whenever a stale cwd was sent. Gating on
 * `package.json` makes the analyzer honest about what's a real workspace.
 */
function isInitializedWorkspaceRoot(cwd: string): boolean {
  return ts.sys.fileExists(path.join(cwd, "package.json"));
}

function workspaceNotInitializedManifest(input: {
  readonly cwd: string;
  readonly relativePathPosix: string;
}): ComponentPreviewManifest {
  return {
    relativePath: input.relativePathPosix,
    exports: [],
    propsByExport: [],
    diagnostics: [`Workspace not initialized: ${input.cwd}/package.json is missing.`],
  };
}

export function analyzeReactComponentFile(input: {
  readonly absolutePath: string;
  readonly cwd: string;
  readonly relativePathPosix: string;
}): ComponentPreviewManifest {
  if (!isInitializedWorkspaceRoot(input.cwd)) {
    return workspaceNotInitializedManifest(input);
  }

  // Real workspace: heal legacy ones that pre-date the scaffold helper.
  // writeIfMissing makes this idempotent — zero-cost when files already exist.
  ensureViteWorkspaceScaffold(input.cwd);

  const compilerOptions = buildAnalyzerCompilerOptions(input.cwd);
  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram([input.absolutePath], compilerOptions, host);
  const checker = program.getTypeChecker();
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));

  return extractManifestFromProgram(program, checker, diagnostics, input);
}

/**
 * Batched analyzer for the registry indexer. Loads one ts.Program for the
 * whole batch instead of paying the lib.d.ts setup cost per file — turns a
 * ~50-file shadcn registry pass from ~8s (sequential) / ~2s (concurrency 4)
 * into a single program build.
 *
 * Falls back to per-file `analyzeReactComponentFile` calls if the shared
 * program fails to load (so one corrupt file can't poison the batch).
 */
export function analyzeReactComponentBatch(input: {
  readonly cwd: string;
  readonly files: readonly { readonly absolutePath: string; readonly relativePathPosix: string }[];
}): readonly ComponentPreviewManifest[] {
  if (input.files.length === 0) {
    return [];
  }

  if (!isInitializedWorkspaceRoot(input.cwd)) {
    return input.files.map((file) =>
      workspaceNotInitializedManifest({
        cwd: input.cwd,
        relativePathPosix: file.relativePathPosix,
      }),
    );
  }

  ensureViteWorkspaceScaffold(input.cwd);

  const compilerOptions = buildAnalyzerCompilerOptions(input.cwd);
  const host = ts.createCompilerHost(compilerOptions, true);
  const rootFiles = input.files.map((f) => f.absolutePath);

  let program: ts.Program;
  try {
    program = ts.createProgram(rootFiles, compilerOptions, host);
  } catch {
    return input.files.map((file) =>
      analyzeReactComponentFile({
        absolutePath: file.absolutePath,
        cwd: input.cwd,
        relativePathPosix: file.relativePathPosix,
      }),
    );
  }

  const checker = program.getTypeChecker();
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));

  return input.files.map((file) => {
    try {
      return extractManifestFromProgram(program, checker, diagnostics, {
        absolutePath: file.absolutePath,
        relativePathPosix: file.relativePathPosix,
      });
    } catch (cause) {
      // One file blew up; fall back to a per-file program so the rest of the
      // batch still produces useful manifests.
      const message = cause instanceof Error ? cause.message : String(cause);
      return {
        ...analyzeReactComponentFile({
          absolutePath: file.absolutePath,
          cwd: input.cwd,
          relativePathPosix: file.relativePathPosix,
        }),
        diagnostics: [`Batched analysis failed; degraded to per-file program: ${message}`],
      };
    }
  });
}
