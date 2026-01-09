import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Hook to handle Android back button behavior for PWA/APK
 * Navigates to previous page instead of closing the app
 */
export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Push initial state to history
    const handlePopState = (event: PopStateEvent) => {
      // Prevent default back behavior and navigate within app
      if (location.pathname !== "/") {
        // If not on home, go back in history
        navigate(-1);
      } else {
        // On home page, push state to prevent exit
        window.history.pushState(null, "", window.location.href);
      }
    };

    // Push initial state
    window.history.pushState(null, "", window.location.href);
    
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, location.pathname]);
};

export default useBackButton;
