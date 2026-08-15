/**
 * Public API slice `complaints` — satu-satunya pintu impor dari luar slice.
 */

export {
  complaintHistory,
  createComplaint,
  listComplaints,
  recentComplaints,
  updateComplaintStatus,
  type RecentComplaintsResult,
} from "./api";
export type {
  Complaint,
  ComplaintHistoryEntry,
  ComplaintInput,
  ComplaintList,
  ComplaintPriority,
  ComplaintStatus,
} from "./types";
