import { FeedbackStatus } from "@/lib/feedbacks/types";
 
export const STATUS_LABEL: Record<FeedbackStatus, string> = {

  OPEN: "Ouverte",

  IN_PROGRESS: "En cours",

  RESOLVED: "Résolue",

  CLOSED: "Clôturée",

};

const COLORS: Record<FeedbackStatus, string> = {

  OPEN: "bg-red-100 text-red-700",

  IN_PROGRESS: "bg-amber-100 text-amber-700",

  RESOLVED: "bg-green-100 text-green-700",

  CLOSED: "bg-gray-200 text-gray-700",

};
 
export default function StatusBadge({ status }: { status: FeedbackStatus }) {

  return (
<span className={`rounded-full px-3 py-1 text-xs font-medium ${COLORS[status]}`}>

      {STATUS_LABEL[status]}
</span>

  );

}