import { Link, useLocation } from "react-router-dom";
import { Home, Search, Sparkles, Bell, LogIn, LayoutDashboard, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const StatusBar = () => {
  const location = useLocation();
  const { user, role } = useAuth();

  const dashboardHref = role === 'admin' ? '/admin' : role === 'agent' ? '/agent-dashboard' : '/dashboard';

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/explore", icon: Sparkles },
    { label: "Search", href: "/properties", icon: Search },
    { label: "Messages", href: "/messages", icon: MessageCircle },
    { label: "Alerts", href: "/notifications", icon: Bell },
    user
      ? { label: "Dashboard", href: dashboardHref, icon: LayoutDashboard }
      : { label: "Sign In", href: "/auth", icon: LogIn },
  ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 sm:px-3 pb-2 sm:pb-3"
      // On Android, env(safe-area-inset-bottom) can be 0 even with a gesture bar.
      // Add a small minimum inset so the bar stays tappable.
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/80 via-sky-500/80 to-sky-600/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(14,165,233,0.35)]"
        // Keep internal padding consistent (outer wrapper handles safe-area + minimum inset)
        style={{ paddingBottom: "0.5rem" }}
      >
        <div className="absolute inset-0 opacity-40 blur-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.6),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.6),transparent_35%)]" />
        <div className="relative grid grid-cols-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)]"
                    : "text-white/80 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur transition-all",
                    isActive
                      ? "scale-105 shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_12px_30px_rgba(249,115,22,0.35)]"
                      : "hover:scale-105 hover:border-white/25"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;

