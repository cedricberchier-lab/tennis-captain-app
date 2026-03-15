"use client";

interface Tab {
  label: string;
  value: string;
}

interface SegmentControlProps {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
}

export default function SegmentControl({ tabs, active, onChange }: SegmentControlProps) {
  return (
    <div className="flex items-center bg-gray-200 rounded-full p-1 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-full transition-all ${
            active === tab.value
              ? "bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
