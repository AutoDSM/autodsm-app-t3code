import { createFileRoute } from "@tanstack/react-router";

import { ComponentPreviewRuntimeApp } from "~/components/ComponentPreviewRuntimeApp";

export const Route = createFileRoute("/_chat/component-preview-runtime")({
  component: ComponentPreviewRuntimeApp,
});
