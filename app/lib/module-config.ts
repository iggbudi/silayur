export type ModuleKey =
  | "visitors"
  | "finance"
  | "operations"
  | "facilities"
  | "complaints";

export type ModuleState = Record<ModuleKey, boolean>;

export const MODULE_STORAGE_KEY = "silayur.module-config.v1";
export const MODULE_CHANGE_EVENT = "silayur:module-config-change";

export const DEFAULT_MODULE_CONFIG: ModuleState = {
  visitors: true,
  finance: true,
  operations: true,
  facilities: true,
  complaints: true,
};

const moduleKeys: ModuleKey[] = [
  "visitors",
  "finance",
  "operations",
  "facilities",
  "complaints",
];

export function parseModuleConfig(value: string | null): ModuleState {
  if (!value) return { ...DEFAULT_MODULE_CONFIG };

  try {
    const parsed = JSON.parse(value) as Partial<ModuleState>;
    return moduleKeys.reduce<ModuleState>(
      (config, key) => {
        config[key] =
          typeof parsed[key] === "boolean"
            ? parsed[key]
            : DEFAULT_MODULE_CONFIG[key];
        return config;
      },
      { ...DEFAULT_MODULE_CONFIG },
    );
  } catch {
    return { ...DEFAULT_MODULE_CONFIG };
  }
}

export function loadModuleConfig(): ModuleState {
  if (typeof window === "undefined") return { ...DEFAULT_MODULE_CONFIG };
  return parseModuleConfig(window.localStorage.getItem(MODULE_STORAGE_KEY));
}

export function saveModuleConfig(config: ModuleState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(MODULE_CHANGE_EVENT));
}
