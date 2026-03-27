import { useLocation, useNavigate } from "react-router-dom";
import { Home, Route, Users, User } from "lucide-react";

const tabs = [
  { path: "/driver", label: "Beranda", icon: Home },
  { path: "/driver/trips", label: "Perjalanan", icon: Route },
  { path: "/driver/passengers", label: "Penumpang", icon: Users },
  { path: "/driver/profile", label: "Profil", icon: User },
];

export function DriverBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/driver"
              ? location.pathname === "/driver"
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors tap-highlight touch-target ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
