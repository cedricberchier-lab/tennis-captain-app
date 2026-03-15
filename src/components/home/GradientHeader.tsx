"use client";

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
}

export default function GradientHeader({ title, subtitle, userName }: GradientHeaderProps) {
  return (
    <div className="relative">
      <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 px-5 pt-12 pb-8">
        {subtitle && (
          <p className="text-purple-100 text-xs font-medium mb-0.5 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
        <h1 className="text-white text-2xl font-bold leading-tight">
          {title}
          {userName && (
            <span className="block">{userName}</span>
          )}
        </h1>
      </div>
      {/* Overlap rounding */}
      <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-100 rounded-t-3xl" />
    </div>
  );
}
