export type FeedbackType = "REVIEW" | "COMPLAINT";
export type FeedbackStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type Role = "PATIENT" | "DOCTOR" | "ADMIN";
 
export interface Feedback {
  id: string;
  user_id: string;
  doctor_id: string;
  appointment_id: string;
  type: FeedbackType;
  rating?: number;
  subject?: string;
  content: string;
  response?: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
  syncStatus: "synced" | "pending";
}