import Link from "next/link";
import { Feedback } from "@/lib/feedbacks/types";
import { userName } from "@/lib/mock";
import StatusBadge from "./StatusBadge";
import RatingStars from "./RatingStars";
 
export default function FeedbackCard({ f }: { f: Feedback }) {
  return (
<Link
      href={`/feedbacks/detail?id=${f.id}`}
      className="block rounded-xl border bg-white p-4 shadow-sm active:bg-gray-50"
>
<div className="mb-2 flex items-center justify-between gap-2">
<span className="text-xs font-semibold uppercase text-sky-700">
          {f.type === "REVIEW" ? "Avis" : "Réclamation"}
</span>
        {f.type === "COMPLAINT" && <StatusBadge status={f.status} />}
</div>
<p className="font-medium">{f.subject ?? `Avis sur ${userName(f.doctor_id)}`}</p>
      {f.type === "REVIEW" && <RatingStars value={f.rating ?? 0} />}
<p className="mt-1 line-clamp-2 text-sm text-gray-600">{f.content}</p>
<div className="mt-2 flex justify-between text-xs text-gray-500">
<span>{userName(f.doctor_id)}</span>
<span>
          {new Date(f.created_at).toLocaleDateString("fr-FR")}
          {f.syncStatus === "pending" && " · ⏳ à synchroniser"}
</span>
</div>
</Link>
  );
}