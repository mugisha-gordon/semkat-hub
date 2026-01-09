import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Onboarding from "./Onboarding";
import WelcomeBack from "./WelcomeBack";

const OnboardingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  useEffect(() => {
    if (loading) return;

    const onboardingCompleted = localStorage.getItem("semkat_onboarding_completed");
    const isNewUser = !onboardingCompleted;

    if (isNewUser) {
      setShowOnboarding(true);
    } else if (user) {
      // Show welcome back EVERY time the app is returned to (using visibility change)
      // On initial mount, also show if not shown in this page load
      const shownThisLoad = sessionStorage.getItem("semkat_welcome_back_current_load");
      if (!shownThisLoad) {
        setShowWelcomeBack(true);
        sessionStorage.setItem("semkat_welcome_back_current_load", "true");
      }
    }
  }, [user, loading]);

  // Listen for visibility change to show welcome back when app is returned to
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loading) {
        const onboardingCompleted = localStorage.getItem("semkat_onboarding_completed");
        if (onboardingCompleted) {
          // Reset the current load flag when becoming visible again
          sessionStorage.removeItem("semkat_welcome_back_current_load");
          setShowWelcomeBack(true);
          sessionStorage.setItem("semkat_welcome_back_current_load", "true");
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loading]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleWelcomeBackComplete = () => {
    setShowWelcomeBack(false);
  };

  // Show onboarding for new users (blocks app)
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Show welcome back overlay and main app
  return (
    <>
      {showWelcomeBack && <WelcomeBack onComplete={handleWelcomeBackComplete} />}
      {children}
    </>
  );
};

export default OnboardingWrapper;
