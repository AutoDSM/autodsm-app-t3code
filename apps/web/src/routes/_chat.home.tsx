import { createFileRoute } from "@tanstack/react-router";

import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

function HomeRouteView() {
  return (
    <SidebarNavInsetPage navLabel="Home">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Home</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Workspace overview. Open a thread from the sidebar or use Search (⌘K) to jump anywhere.
        </p>
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/home")({
  component: HomeRouteView,
});
