import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import * as DesktopConfig from "./DesktopConfig.ts";

const load = (env: Record<string, string | undefined>) =>
  Effect.gen(function* () {
    return yield* DesktopConfig.DesktopConfig;
  }).pipe(Effect.provide(DesktopConfig.layerTest(env)));

describe("DesktopConfig AUTODSM_/T3CODE_ env-var bridge", () => {
  it.effect("prefers the AUTODSM_-prefixed var over the legacy T3CODE_ name", () =>
    Effect.gen(function* () {
      const config = yield* load({
        AUTODSM_HOME: "/new/home",
        T3CODE_HOME: "/legacy/home",
      });
      assert.deepStrictEqual(config.t3Home, Option.some("/new/home"));
    }),
  );

  it.effect("falls back to the legacy T3CODE_ name when AUTODSM_ is unset", () =>
    Effect.gen(function* () {
      const config = yield* load({ T3CODE_HOME: "/legacy/home" });
      assert.deepStrictEqual(config.t3Home, Option.some("/legacy/home"));
    }),
  );

  it.effect("reads boolean flags from either prefix, AUTODSM_ winning ties", () =>
    Effect.gen(function* () {
      const legacy = yield* load({ T3CODE_DISABLE_AUTO_UPDATE: "true" });
      assert.equal(legacy.disableAutoUpdate, true);

      const modern = yield* load({ AUTODSM_DISABLE_AUTO_UPDATE: "true" });
      assert.equal(modern.disableAutoUpdate, true);

      // The AUTODSM_ value takes precedence even when the legacy var disagrees.
      const both = yield* load({
        AUTODSM_DISABLE_AUTO_UPDATE: "false",
        T3CODE_DISABLE_AUTO_UPDATE: "true",
      });
      assert.equal(both.disableAutoUpdate, false);
    }),
  );

  it.effect("bridges typed (port/int) vars and prefers AUTODSM_", () =>
    Effect.gen(function* () {
      const legacy = yield* load({ T3CODE_PORT: "4321" });
      assert.deepStrictEqual(legacy.configuredBackendPort, Option.some(4321));

      const both = yield* load({ AUTODSM_PORT: "5000", T3CODE_PORT: "4321" });
      assert.deepStrictEqual(both.configuredBackendPort, Option.some(5000));
    }),
  );

  it.effect("falls back to defaults when neither prefix is present", () =>
    Effect.gen(function* () {
      const config = yield* load({});
      assert.deepStrictEqual(config.t3Home, Option.none());
      assert.equal(config.disableAutoUpdate, false);
      assert.deepStrictEqual(config.configuredBackendPort, Option.none());
      assert.equal(config.otlpExportIntervalMs, 10_000);
      assert.equal(config.mockUpdateServerPort, 3000);
    }),
  );
});
