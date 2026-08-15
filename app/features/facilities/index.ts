/**
 * Public API slice `facilities` — satu-satunya pintu impor dari luar slice.
 */

export { facilityHistory, facilitySummary, setFacilityStatus } from "./api";
export type {
  FacilityHistoryEntry,
  FacilityStatusCounts,
  FacilityStatusInput,
  FacilityStatusRow,
  FacilityStatusSummary,
  FacilityStatusValue,
  FacilityWithStatus,
} from "./types";
