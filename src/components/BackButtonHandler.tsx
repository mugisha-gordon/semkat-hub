import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

/**
 * Component to handle Android back button behavior for PWA/APK
 * - Uses Capacitor App backButton listener when available
 * - Navigates to previous route instead of closing the app
 * - If there is no history, it will navigate to root ("/") instead of exiting
 */
const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (ev?: { canGoBack?: boolean }) => {
      try {
        // Prefer Capacitor's canGoBack when available.
        if (ev?.canGoBack) {
          navigate(-1);
          return;
        }

        // Fallback heuristic for SPA history.
        const canGoBack = window.history.state?.idx != null && window.history.state.idx > 0;
        if (canGoBack) {
          navigate(-1);
          return;
        }

        // If we're not on home, go home. If we're already home, do nothing (don't exit the app).
        if (location.pathname !== "/") {
          navigate("/", { replace: true });
        }
      } catch (e) {
        if (location.pathname !== "/") {
          navigate("/", { replace: true });
        }
      }
    };

    // Capacitor App back button (Android hardware)
    const removeListener = CapacitorApp.addListener("backButton", handler);

    return () => {
      removeListener && removeListener.remove && removeListener.remove();
    };
  }, [navigate, location.pathname]);

  return null;
};

export default BackButtonHandler;

