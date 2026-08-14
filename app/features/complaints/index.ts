/**
 * Public API slice `complaints` — satu-satunya pintu impor dari luar slice.
 */

export {
  createComplaint,
  listComplaints,
  recentComplaints,
  updateComplaintStatus,
  type RecentComplaintsResult,
} from "./api";
export type {
  Complaint,
  ComplaintInput,
  ComplaintList,
  ComplaintPriority,
  ComplaintStatus,
} from "./types";
