"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainings } from "@/hooks/useTrainings";
import { Menu } from "lucide-react";
import Link from "next/link";

// ── Placeholder data — replace with real DB queries ──────────────────────────
const UPCOMING_EVENTS = [
  { type: "Training", date: "17/03", time: "19:00" },
  { type: "Match",    date: "19/03", time: "14:00" },
];

const LAST_MATCHES = [
  { label: "TC Fribourg vs TC Lausanne", date: "08/03", time: "14:00" },
  { label: "TC Berne vs TC Fribourg",    date: "01/03", time: "14:00" },
];

// ── Small reusable pieces ─────────────────────────────────────────────────────

function EventCard({ title, date, time }: { title: string; date: string; time: string }) {
  return (
    <div className="bg-gray-100 rounded-2xl p-4 flex flex-col gap-1 min-h-[110px]">
      <p className="font-bold text-gray-900 text-sm">{title}</p>
      <p className="text-gray-500 text-sm">{date} {time}</p>
    </div>
  );
}

function MatchCard({ label, date, time }: { label: string; date: string; time: string }) {
  return (
    <div className="bg-gray-100 rounded-2xl p-4 flex flex-col gap-1 min-h-[110px]">
      <p className="font-bold text-gray-900 text-sm">{label}</p>
      <p className="text-gray-500 text-sm">{date} {time}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? user?.username ?? "Captain";
  const [activeNav, setActiveNav] = useState("home");

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2">
        <button className="p-1">
          <Menu className="h-7 w-7 text-gray-900 stroke-[2.5px]" />
        </button>
        <Link href="/login" className="font-bold text-gray-900 text-base">
          Login
        </Link>
      </div>

      {/* Welcome */}
      <div className="px-5 pt-4 pb-6">
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          Welcome back,<br />{firstName}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 px-5 space-y-7 pb-32">

        {/* Upcoming events */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Up coming events</h2>
          <div className="grid grid-cols-2 gap-3">
            {UPCOMING_EVENTS.map((ev, i) => (
              <EventCard key={i} title={ev.type} date={ev.date} time={ev.time} />
            ))}
          </div>
        </section>

        {/* Last matches */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Last Matchs</h2>
          <div className="grid grid-cols-2 gap-3">
            {LAST_MATCHES.map((m, i) => (
              <MatchCard key={i} label={m.label} date={m.date} time={m.time} />
            ))}
          </div>
        </section>

      </div>

      {/* Bottom nav — 3 pill buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-4 px-6 py-5 bg-white border-t border-gray-100">
          {[
            { label: "Train", value: "train",  href: "/training" },
            { label: "Home",  value: "home",   href: "/home"     },
            { label: "Match", value: "match",  href: "/team"     },
          ].map(({ label, value, href }) => (
            <Link
              key={value}
              href={href}
              onClick={() => setActiveNav(value)}
              className={`flex-1 text-center py-3 rounded-2xl border-2 font-semibold text-sm transition-all ${
                activeNav === value
                  ? "border-gray-900 text-gray-900 bg-white"
                  : "border-gray-300 text-gray-500 bg-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
