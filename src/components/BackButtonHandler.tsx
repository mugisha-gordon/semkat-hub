import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Component to handle Android back button behavior for PWA/APK
 * Navigates to previous page instead of closing the app
 */
const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent the default behavior which would close the app
      event.preventDefault();
      
      // Push a new state to keep the history populated
      window.history.pushState(null, "", window.location.href);
    };

    // Push initial state to prevent immediate back
    window.history.pushState(null, "", window.location.href);
    
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, location.pathname]);

  return null;
};

export default BackButtonHandler;

