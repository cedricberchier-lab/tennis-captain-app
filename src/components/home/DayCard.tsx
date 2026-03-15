"use client";

interface DayCardProps {
  dayLabel: string;
  dateNumber: number | string;
  status?: "training" | "match" | "free" | "past";
}

const statusColor: Record<string, string> = {
  training: "bg-blue-400",
  match:    "bg-green-400",
  free:     "bg-gray-300",
  past:     "bg-gray-200",
};

export default function DayCard({ dayLabel, dateNumber, status }: DayCardProps) {
  return (
    <div className="relative bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-4 px-2 h-full min-h-[72px]">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {dayLabel}
      </span>
      <span className="text-xl font-bold text-gray-800 mt-0.5">
        {dateNumber}
      </span>
      {status && status !== "free" && (
        <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${statusColor[status]}`} />
      )}
    </div>
  );
}
