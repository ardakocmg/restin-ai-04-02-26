/**
 * MEGA PATCH: Bottom Navigation Component
 * Mobile/Tablet-friendly bottom navigation for POS and KDS
 */
import { useNavigate, useLocation } from "react-router-dom";
import { Home, UtensilsCrossed, DollarSign, Settings } from "lucide-react";

export default function BottomNav({ mode = "pos", onFilterChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  const posNav = [
    { icon: Home, label: "Floor", path: "/pos" },
    { icon: UtensilsCrossed, label: "Menu", path: "/pos" },
    { icon: DollarSign, label: "Payments", path: "/pos" },
    { icon: Settings, label: "Settings", path: "/pos/settings" }
  ];

  const kdsNav = [
    { label: "All", value: "all" },
    { label: "Kitchen", value: "kitchen" },
    { label: "Bar", value: "bar" },
    { label: "Pass", value: "pass" },
    { label: "Held", value: "held" }
  ];

  const tabs = mode === "pos" ? posNav : kdsNav;

  if (mode === "pos") {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 md:hidden z-40">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.label}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center px-4 py-2 ${
                  isActive ? "text-red-500" : "text-zinc-400"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // KDS tabs (filter-style)
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 md:hidden z-40">
      <div className="flex justify-around py-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange && onFilterChange(tab.value)}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white active:text-red-500"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
