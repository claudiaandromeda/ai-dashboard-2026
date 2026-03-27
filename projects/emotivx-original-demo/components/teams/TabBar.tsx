"use client";

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "featured", label: "Featured", icon: "☆" },
  { id: "players", label: "Players", icon: "👥" },
  { id: "matches", label: "Matches", icon: "📅" },
];

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  accentColor: string;
}

export default function TabBar({ activeTab, onTabChange, accentColor }: TabBarProps) {
  return (
    <div className="flex gap-1 border-b border-white/5">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative px-4 py-3 text-sm font-medium transition"
            style={{ color: isActive ? "#FFFFFF" : "#888888" }}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
