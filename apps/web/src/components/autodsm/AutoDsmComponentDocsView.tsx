"use client";

import type { ComponentPreviewManifest, EnvironmentId } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";

import { ensureEnvironmentApi } from "~/environmentApi";
import { propsForExport } from "~/lib/componentPreviewProps";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentDocsViewProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string;
  readonly manifest: ComponentPreviewManifest | undefined;
  readonly exportName: string;
  readonly className?: string;
}

/** Candidate README paths to look for next to the component, in priority order. */
function readmeCandidates(relativePath: string): readonly string[] {
  const normalized = relativePath.replace(/\\/g, "/");
  const dir = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
  const file = normalized.split("/").pop() ?? normalized;
  const stem = file.replace(/\.(tsx|jsx|ts|js)$/i, "");
  const join = (name: string) => (dir.length > 0 ? `${dir}/${name}` : name);
  return [join(`${stem}.md`), join(`${stem}.README.md`), join("README.md")];
}

function formatDefault(defaultJson: string | undefined): string {
  if (defaultJson === undefined) return "—";
  try {
    const parsed = JSON.parse(defaultJson) as unknown;
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
  } catch {
    return defaultJson;
  }
}

export function AutoDsmComponentDocsView(props: AutoDsmComponentDocsViewProps): JSX.Element {
  const { relativePath, environmentId, workspaceCwd, manifest, exportName, className } = props;

  const specs = manifest ? propsForExport(manifest, exportName) : [];

  // Best-effort README lookup: try each candidate, use the first that reads.
  const readmeQuery = useQuery({
    queryKey: ["autodsm", "component-readme", environmentId, workspaceCwd, relativePath],
    staleTime: 30_000,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId);
      for (const candidate of readmeCandidates(relativePath)) {
        try {
          const result = await api.projects.readFile({ cwd: workspaceCwd, relativePath: candidate });
          if (result.contents.trim().length > 0) {
            return { path: candidate, contents: result.contents };
          }
        } catch {
          // Try the next candidate.
        }
      }
      return null;
    },
  });

  const readme = readmeQuery.data;

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-background p-4 text-foreground",
        className,
      )}
      data-testid="autodsm-component-docs-view"
    >
      <section className="mb-6">
        <h3 className="mb-2 font-semibold text-sm">Props</h3>
        {specs.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No documented props for <code className="font-mono">{exportName}</code>.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Required</th>
                  <th className="px-3 py-2 font-medium">Default</th>
                </tr>
              </thead>
              <tbody>
                {specs.map((spec) => (
                  <tr key={spec.name} className="border-border/40 border-t align-top">
                    <td className="px-3 py-2 font-mono">{spec.name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {spec.kind}
                      {spec.enumValues && spec.enumValues.length > 0
                        ? `: ${spec.enumValues.join(" | ")}`
                        : ""}
                    </td>
                    <td className="px-3 py-2">{spec.optional ? "—" : "yes"}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {formatDefault(spec.defaultJson)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-sm">README</h3>
        {readmeQuery.isPending ? (
          <p className="text-muted-foreground text-xs">Looking for a README…</p>
        ) : readme ? (
          <>
            <p className="mb-2 font-mono text-[10px] text-muted-foreground">{readme.path}</p>
            <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed">
              {readme.contents}
            </pre>
          </>
        ) : (
          <p className="text-muted-foreground text-xs">
            No README found next to this component. Add a{" "}
            <code className="font-mono">{`${(relativePath.split("/").pop() ?? "Component").replace(/\.(tsx|jsx|ts|js)$/i, "")}.md`}</code>{" "}
            to document it.
          </p>
        )}
      </section>
    </div>
  );
}
