const styles = {
  paid: "bg-emerald-100 text-emerald-700",
  free: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
} as const;

const labels = {
  paid: "Active",
  free: "Free Access",
  pending: "Pending Payment",
} as const;

export default function StatusBadge({ status }: { status: "paid" | "free" | "pending" }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
