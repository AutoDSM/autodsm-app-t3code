import { getSupabaseBrowserClient } from "./browserClient";
import { isSupabaseAuthConfigured } from "./config";
import { sha256Hex } from "./hash";

export interface RecordAutoDsmPublishStatsInput {
  readonly workspaceId: string;
  readonly packageName: string;
  readonly version: string;
  readonly componentCount?: number;
  readonly tokenCount?: number;
}

/** Insert a privacy-preserving publish stat row (hashed identifiers only). */
export async function recordAutoDsmPublishStats(
  input: RecordAutoDsmPublishStatsInput,
): Promise<void> {
  if (!isSupabaseAuthConfigured()) {
    return;
  }

  const client = getSupabaseBrowserClient();
  if (client === null) {
    return;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return;
  }

  const [workspaceIdHash, packageNameHash] = await Promise.all([
    sha256Hex(input.workspaceId),
    sha256Hex(input.packageName),
  ]);

  const { error } = await client.from("publish_stats").insert({
    user_id: userData.user.id,
    workspace_id_hash: workspaceIdHash,
    package_name_hash: packageNameHash,
    version: input.version,
    ...(input.componentCount !== undefined ? { component_count: input.componentCount } : {}),
    ...(input.tokenCount !== undefined ? { token_count: input.tokenCount } : {}),
  });

  if (error) {
    console.warn("Failed to record AutoDSM publish stats", error.message);
  }
}
