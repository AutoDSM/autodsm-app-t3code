import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmHomeDashboard } from "~/components/autodsm/AutoDsmHomeDashboard";
import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

function HomeRouteView() {
  return (
    <SidebarNavInsetPage navLabel="Home">
      <AutoDsmHomeDashboard />
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/home")({
  component: HomeRouteView,
});
