import { AutoDsmWatermark } from "~/components/autodsm/AutoDsmWatermark";

export function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex size-24 items-center justify-center" aria-label="autoDSM splash screen">
        <AutoDsmWatermark className="size-16" />
      </div>
    </div>
  );
}
