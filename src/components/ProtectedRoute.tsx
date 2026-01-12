import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "agent";
}

const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  // Hard-coded admin email check
  const ADMIN_EMAIL = "adminsemkat@gmail.com";
  const isAdminEmail = user?.email === ADMIN_EMAIL;
  const effectiveRole = isAdminEmail ? 'admin' : role;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-semkat-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // If a specific role is required, check for it
  // Admin can access everything (including agent dashboard)
  if (requireRole) {
    if (effectiveRole === 'admin' || isAdminEmail) {
      return <>{children}</>;
    }
    // Agents can access agent routes
    if (requireRole === 'agent' && effectiveRole === 'agent') {
      return <>{children}</>;
    }
    // If role doesn't match, redirect
    if (effectiveRole !== requireRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

