import type {
  ConfigItemsState,
  ConfigSectionKey,
  ModuleKey,
} from "../../shared/config";

export type SettingsSectionKey =
  | "modules"
  | ConfigSectionKey
  | "holidays"
  | "users";

export type SettingsItem = {
  id: string;
  name: string;
  detail: string;
  active: boolean;
  badge?: string;
  moduleKey?: ModuleKey;
  section?: ConfigSectionKey;
  sortOrder?: number;
};

export function toConfigItemsState(
  items: Record<SettingsSectionKey, SettingsItem[]>,
): ConfigItemsState {
  const convert = (section: ConfigSectionKey) =>
    items[section].map((item, index) => ({
      id: item.id,
      section,
      name: item.name,
      detail: item.detail,
      active: item.active,
      sortOrder: item.sortOrder ?? (index + 1) * 10,
    }));

  return {
    tickets: convert("tickets"),
    hours: convert("hours"),
    "operating-hours": convert("operating-hours"),
    shifts: convert("shifts"),
    facilities: convert("facilities"),
    revenue: convert("revenue"),
  };
}
