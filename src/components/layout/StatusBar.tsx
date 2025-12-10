import { Link, useLocation } from "react-router-dom";
import { Home, Search, Sparkles, Bell, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/explore", icon: Sparkles },
  { label: "Search", href: "/properties", icon: Search },
  { label: "Alerts", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: UserRound },
];

const StatusBar = () => {
  const location = useLocation();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/80 via-sky-500/80 to-sky-600/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(14,165,233,0.35)]">
        <div className="absolute inset-0 opacity-40 blur-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.6),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.6),transparent_35%)]" />
        <div className="relative grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-all duration-200",
                  isActive
                    ? "text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)]"
                    : "text-white/80 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur transition-all",
                    isActive
                      ? "scale-105 shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_12px_30px_rgba(249,115,22,0.35)]"
                      : "hover:scale-105 hover:border-white/25"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;

