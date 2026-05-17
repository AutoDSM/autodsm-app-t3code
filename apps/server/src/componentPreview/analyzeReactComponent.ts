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

export function analyzeReactComponentFile(input: {
  readonly absolutePath: string;
  readonly cwd: string;
  readonly relativePathPosix: string;
}): ComponentPreviewManifest {
  const configPath = ts.findConfigFile(input.cwd, ts.sys.fileExists, "tsconfig.json");

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
      compilerOptions.noEmit = true;
    }
  }

  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram([input.absolutePath], compilerOptions, host);
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(input.absolutePath);

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));

  if (!sf) {
    return {
      relativePath: input.relativePathPosix,
      exports: [],
      propsByExport: [],
      diagnostics: [...diagnostics, "Could not load source file."],
    };
  }

  const moduleSymbol = getSourceFileModuleSymbol(sf);
  if (!moduleSymbol) {
    return {
      relativePath: input.relativePathPosix,
      exports: [],
      propsByExport: [],
      diagnostics: [...diagnostics, "Could not load module symbol."],
    };
  }

  const exportSpecs: ComponentPreviewExportSpec[] = [];
  const propsByExport: ComponentPreviewPropsEntry[] = [];

  const moduleExports = checker.getExportsOfModule(moduleSymbol);

  for (const exp of moduleExports) {
    const rawName = exp.getName();
    if (rawName.startsWith("__")) continue;

    const sym = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;

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
    diagnostics,
  };
}
