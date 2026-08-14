/**
 * Public API slice `facilities` — satu-satunya pintu impor dari luar slice.
 */

export { facilitySummary, setFacilityStatus } from "./api";
export type {
  FacilityStatusCounts,
  FacilityStatusInput,
  FacilityStatusRow,
  FacilityStatusSummary,
  FacilityStatusValue,
  FacilityWithStatus,
} from "./types";
