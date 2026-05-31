import type { JSX } from "react";
import * as Tabs from "@radix-ui/react-tabs";

export interface TwTabsProps {
  readonly defaultValue?: string;
}

const triggerClass =
  "rounded-md px-3 py-1.5 text-sm font-medium text-[var(--foreground)] opacity-70 data-[state=active]:bg-[var(--background)] data-[state=active]:opacity-100 data-[state=active]:shadow-sm";

export function TwTabs(props: TwTabsProps = {}): JSX.Element {
  const { defaultValue = "account" } = props;
  return (
    <Tabs.Root defaultValue={defaultValue} className="w-80">
      <Tabs.List className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--muted)] p-1">
        <Tabs.Trigger value="account" className={triggerClass}>
          Account
        </Tabs.Trigger>
        <Tabs.Trigger value="password" className={triggerClass}>
          Password
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content
        value="account"
        className="mt-3 rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--foreground)]"
      >
        Make changes to your account here. Click save when you're done.
      </Tabs.Content>
      <Tabs.Content
        value="password"
        className="mt-3 rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--foreground)]"
      >
        Change your password here. You'll be signed out of all sessions.
      </Tabs.Content>
    </Tabs.Root>
  );
}

export function TwTabsVertical(_props: TwTabsProps = {}): JSX.Element {
  return (
    <Tabs.Root defaultValue="general" orientation="vertical" className="flex w-96 gap-3">
      <Tabs.List className="flex w-32 flex-col items-stretch gap-1 rounded-lg bg-[var(--muted)] p-1">
        <Tabs.Trigger value="general" className={triggerClass + " text-left"}>
          General
        </Tabs.Trigger>
        <Tabs.Trigger value="security" className={triggerClass + " text-left"}>
          Security
        </Tabs.Trigger>
        <Tabs.Trigger value="integrations" className={triggerClass + " text-left"}>
          Integrations
        </Tabs.Trigger>
      </Tabs.List>
      <div className="flex-1 rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--foreground)]">
        <Tabs.Content value="general">General workspace preferences.</Tabs.Content>
        <Tabs.Content value="security">Manage MFA and session security.</Tabs.Content>
        <Tabs.Content value="integrations">Connect Figma, GitHub, and more.</Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
