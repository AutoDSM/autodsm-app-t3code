export function isAutoDsmComponentAgentThread(
  threadKey: string | null | undefined,
  autoDsmThreadComponentPathById: Readonly<Record<string, string>>,
): boolean {
  if (!threadKey?.trim()) {
    return false;
  }
  const path = autoDsmThreadComponentPathById[threadKey];
  return typeof path === "string" && path.trim().length > 0;
}

export function shouldAutoTitleThreadOnFirstMessage(input: {
  readonly isFirstMessage: boolean;
  readonly isServerThread: boolean;
  readonly isComponentAgentThread: boolean;
}): boolean {
  return input.isFirstMessage && input.isServerThread && !input.isComponentAgentThread;
}

export function resolveTurnStartTitleSeed(input: {
  readonly isComponentAgentThread: boolean;
  readonly titleFromPrompt: string;
}): string | undefined {
  if (input.isComponentAgentThread) {
    return undefined;
  }
  return input.titleFromPrompt;
}
