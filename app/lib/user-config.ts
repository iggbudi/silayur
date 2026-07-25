import type { AppUser } from "../../shared/config";
import seedData from "../../db/seed-data.json";

export type LocalUser = AppUser;

export const DEFAULT_USERS: LocalUser[] = seedData.users.map((user) => ({
  ...user,
}));
