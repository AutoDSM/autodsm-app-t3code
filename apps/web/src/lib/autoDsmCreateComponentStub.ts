/**
 * Minimal, dependency-free component stub written when a component is created so
 * the new component page renders immediately (a valid `export default`) instead
 * of the "Export default not found / Could not load source file" error while the
 * coding agent writes the real implementation. The agent overwrites this file on
 * its first turn.
 */

function componentIdentifier(componentName: string): string {
  const pascal = componentName
    .replace(/[^A-Za-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  if (pascal.length === 0) return "Component";
  return /^[A-Za-z]/.test(pascal) ? pascal : `Component${pascal}`;
}

export function buildCreateComponentStub(input: {
  readonly componentName: string;
  readonly label: string;
}): string {
  const name = componentIdentifier(input.componentName);
  const label = input.label.trim() || name;
  return `// AutoDSM stub — generated on create; the coding agent will replace this.
export default function ${name}() {
  return (
    <div
      data-autodsm-stub
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "8rem",
        padding: "1.5rem",
        borderRadius: "0.75rem",
        border: "1px dashed rgba(127,127,127,0.4)",
        color: "rgba(127,127,127,0.9)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "0.875rem",
      }}
    >
      ${label} — generating…
    </div>
  );
}
`;
}
