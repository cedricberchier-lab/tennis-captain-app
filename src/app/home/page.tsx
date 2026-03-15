"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import GradientHeader from "@/components/home/GradientHeader";
import SegmentControl from "@/components/home/SegmentControl";
import DayCard from "@/components/home/DayCard";
import ActionPill from "@/components/home/ActionPill";
import BottomNavigation from "@/components/home/BottomNavigation";

const TABS = [
  { label: "All",       value: "all" },
  { label: "Training",  value: "training" },
  { label: "Match",     value: "match" },
];

// Placeholder schedule rows — replace with real data
const UPCOMING = [
  { day: "Mon", date: 17, type: "training", label: "Training", sublabel: "19:00 · Court 2",  tag: "Upcoming", tagColor: "bg-blue-100 text-blue-600" },
  { day: "Wed", date: 19, type: "match",    label: "Match",    sublabel: "14:00 · Away",      tag: "Match",    tagColor: "bg-green-100 text-green-600" },
  { day: "Sat", date: 22, type: "training", label: "Training", sublabel: "10:00 · Court 1",   tag: "Upcoming", tagColor: "bg-blue-100 text-blue-600" },
];

const LAST_MATCHES = [
  { day: "Sat", date: 8,  type: "past", label: "TC Lausanne vs TC Fribourg", sublabel: "3 – 0  ·  Win",  tag: "W", tagColor: "bg-green-100 text-green-600" },
  { day: "Sat", date: 1,  type: "past", label: "TC Fribourg vs TC Berne",    sublabel: "1 – 2  ·  Loss", tag: "L", tagColor: "bg-red-100 text-red-500"   },
  { day: "Sat", date: 22, type: "past", label: "TC Sion vs TC Fribourg",     sublabel: "2 – 1  ·  Win",  tag: "W", tagColor: "bg-green-100 text-green-600" },
];

export default function HomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  const firstName = user?.name?.split(" ")[0] ?? user?.username ?? "Captain";

  const filteredUpcoming = activeTab === "all"
    ? UPCOMING
    : UPCOMING.filter((r) => r.type === activeTab);

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <GradientHeader
        subtitle="Welcome back"
        title={firstName}
      />

      {/* Content */}
      <div className="px-4 pt-2 space-y-6">

        {/* Segment control */}
        <SegmentControl tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {/* Upcoming events */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">Upcoming events</h2>
          <div className="space-y-3">
            {filteredUpcoming.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No upcoming events</p>
            )}
            {filteredUpcoming.map((row, i) => (
              <div key={i} className="grid grid-cols-[72px_1fr] gap-3 items-center">
                <DayCard dayLabel={row.day} dateNumber={row.date} status={row.type as "training" | "match"} />
                <ActionPill
                  label={row.label}
                  sublabel={row.sublabel}
                  tag={row.tag}
                  tagColor={row.tagColor}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Last matches */}
        {(activeTab === "all" || activeTab === "match") && (
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3">Last Matches</h2>
            <div className="space-y-3">
              {LAST_MATCHES.map((row, i) => (
                <div key={i} className="grid grid-cols-[72px_1fr] gap-3 items-center">
                  <DayCard dayLabel={row.day} dateNumber={row.date} status="past" />
                  <ActionPill
                    label={row.label}
                    sublabel={row.sublabel}
                    tag={row.tag}
                    tagColor={row.tagColor}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
