import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Option from "effect/Option";

const trimNonEmptyOption = (value: string): Option.Option<string> => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? Option.some(trimmed) : Option.none();
};

// Read a config value under the first (AutoDSM-prefixed) env var name, falling
// back to later (legacy `T3CODE_`-prefixed) names when the new one is unset.
// This is the brand-cutover env-var compatibility bridge (see .plans/22 Phase 4):
// existing local/dev setups keep working with `T3CODE_*`, while fresh setups
// should prefer the `AUTODSM_*` names. Each name is read independently as an
// Option, so a *set-but-invalid* value still surfaces its validation error
// instead of being silently masked by a fallback. Pass a single name for
// standard/external vars (APPDATA, XDG_CONFIG_HOME, APPIMAGE) outside the rebrand.
const optionOf = <A>(
  make: (name: string) => Config.Config<A>,
  names: readonly [string, ...string[]],
): Config.Config<Option.Option<A>> =>
  names.length === 1
    ? make(names[0]).pipe(Config.option)
    : Config.all(names.map((name) => make(name).pipe(Config.option))).pipe(
        Config.map((options) => options.reduce((acc, option) => Option.orElse(acc, () => option))),
      );

const trimmedString = (...names: [string, ...string[]]) =>
  optionOf(Config.string, names).pipe(Config.map(Option.flatMap(trimNonEmptyOption)));

const optionalBoolean = (...names: [string, ...string[]]) =>
  optionOf(Config.boolean, names).pipe(Config.map(Option.getOrElse(() => false)));

const commaSeparatedStrings = (...names: [string, ...string[]]) =>
  trimmedString(...names).pipe(
    Config.map(
      Option.match({
        onNone: () => [],
        onSome: (value) =>
          value
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
      }),
    ),
  );

const compactEnv = (env: Readonly<Record<string, string | undefined>>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );

export const DesktopConfig = Config.all({
  appDataDirectory: trimmedString("APPDATA"),
  xdgConfigHome: trimmedString("XDG_CONFIG_HOME"),
  t3Home: trimmedString("AUTODSM_HOME", "T3CODE_HOME"),
  devServerUrl: Config.url("VITE_DEV_SERVER_URL").pipe(Config.option),
  devRemoteT3ServerEntryPath: trimmedString(
    "AUTODSM_DEV_REMOTE_SERVER_ENTRY_PATH",
    "T3CODE_DEV_REMOTE_T3_SERVER_ENTRY_PATH",
  ),
  configuredBackendPort: optionOf(Config.port, ["AUTODSM_PORT", "T3CODE_PORT"]),
  commitHashOverride: trimmedString("AUTODSM_COMMIT_HASH", "T3CODE_COMMIT_HASH"),
  desktopLanHostOverride: trimmedString("AUTODSM_DESKTOP_LAN_HOST", "T3CODE_DESKTOP_LAN_HOST"),
  desktopHttpsEndpointUrls: commaSeparatedStrings(
    "AUTODSM_DESKTOP_HTTPS_ENDPOINTS",
    "T3CODE_DESKTOP_HTTPS_ENDPOINTS",
  ),
  otlpTracesUrl: trimmedString("AUTODSM_OTLP_TRACES_URL", "T3CODE_OTLP_TRACES_URL"),
  otlpExportIntervalMs: optionOf(Config.int, [
    "AUTODSM_OTLP_EXPORT_INTERVAL_MS",
    "T3CODE_OTLP_EXPORT_INTERVAL_MS",
  ]).pipe(Config.map(Option.getOrElse(() => 10_000))),
  appImagePath: trimmedString("APPIMAGE"),
  disableAutoUpdate: optionalBoolean("AUTODSM_DISABLE_AUTO_UPDATE", "T3CODE_DISABLE_AUTO_UPDATE"),
  mockUpdates: optionalBoolean("AUTODSM_DESKTOP_MOCK_UPDATES", "T3CODE_DESKTOP_MOCK_UPDATES"),
  mockUpdateServerPort: optionOf(Config.port, [
    "AUTODSM_DESKTOP_MOCK_UPDATE_SERVER_PORT",
    "T3CODE_DESKTOP_MOCK_UPDATE_SERVER_PORT",
  ]).pipe(Config.map(Option.getOrElse(() => 3000))),
});

export const layerTest = (env: Readonly<Record<string, string | undefined>>) =>
  ConfigProvider.layer(ConfigProvider.fromEnv({ env: compactEnv(env) }));
