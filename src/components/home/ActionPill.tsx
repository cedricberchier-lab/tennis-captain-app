"use client";

interface ActionPillProps {
  label: string;
  sublabel?: string;
  tag?: string;
  tagColor?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function ActionPill({
  label,
  sublabel,
  tag,
  tagColor = "bg-purple-100 text-purple-600",
  onClick,
  active,
}: ActionPillProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-full px-4 py-2.5 shadow-sm transition-all ${
        active
          ? "bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white"
          : "bg-white text-gray-800 hover:bg-gray-50"
      }`}
    >
      <div className="text-left">
        <p className={`text-sm font-bold leading-tight ${active ? "text-white" : "text-gray-800"}`}>
          {label}
        </p>
        {sublabel && (
          <p className={`text-xs mt-0.5 ${active ? "text-white/80" : "text-gray-400"}`}>
            {sublabel}
          </p>
        )}
      </div>
      {tag && !active && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tagColor}`}>
          {tag}
        </span>
      )}
    </button>
  );
}
