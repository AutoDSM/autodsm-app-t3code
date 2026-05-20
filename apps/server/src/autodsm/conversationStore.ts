// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  AutoDsmComponentConversation,
  type AutoDsmComponentConversationAppendInput,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { conversationFilePath, resolveAutodsmWorkspaceLayout } from "./autodsmWorkspacePaths.ts";

const decodeConversation = Schema.decodeUnknownSync(AutoDsmComponentConversation);

function normalizeComponentPath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, "/").trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function writeJsonAtomic(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

export function loadComponentConversation(
  cwd: string,
  componentPath: string,
): AutoDsmComponentConversation | null {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  const filePath = conversationFilePath(layout.conversationsDir, componentPath);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return decodeConversation(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function appendComponentConversation(
  input: AutoDsmComponentConversationAppendInput,
): AutoDsmComponentConversation {
  const layout = resolveAutodsmWorkspaceLayout(input.cwd);
  const componentPath = normalizeComponentPath(input.componentPath);
  const filePath = conversationFilePath(layout.conversationsDir, componentPath);
  const existing =
    loadComponentConversation(input.cwd, componentPath) ??
    ({
      componentPath,
      threadIds: [],
      messages: [],
      updatedAt: input.message.createdAt,
      ...(input.componentId !== undefined ? { componentId: input.componentId } : {}),
    } satisfies AutoDsmComponentConversation);

  const threadIds = existing.threadIds.includes(input.threadId)
    ? existing.threadIds
    : [...existing.threadIds, input.threadId];

  const next: AutoDsmComponentConversation = {
    ...existing,
    componentPath,
    threadIds,
    messages: [...existing.messages, input.message],
    updatedAt: input.message.createdAt,
    ...(input.componentId !== undefined
      ? { componentId: input.componentId }
      : existing.componentId !== undefined
        ? { componentId: existing.componentId }
        : {}),
  };
  writeJsonAtomic(filePath, next);
  return next;
}
