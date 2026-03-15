"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, Users, Search, CalendarOff } from "lucide-react";

const NAV_ITEMS = [
  { href: "/training", label: "Train",   icon: Activity },
  { href: "/home",    label: "Home",     icon: Home     },
  { href: "/team",    label: "Team",     icon: Users    },
  { href: "/search",  label: "Search",   icon: Search   },
  { href: "/absence", label: "Absence",  icon: CalendarOff },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[52px] ${
                active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5px]" : "stroke-2"}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
