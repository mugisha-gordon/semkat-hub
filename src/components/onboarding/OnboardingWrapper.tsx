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
    const forceOnboarding = localStorage.getItem("semkat_show_onboarding_on_next_open") === "true";

    if (isNewUser || forceOnboarding) {
      setShowOnboarding(true);
      // clear the force flag so it only triggers once
      localStorage.removeItem("semkat_show_onboarding_on_next_open");
    } else if (user) {
      // Show welcome back only once per page load
      const shownThisLoad = sessionStorage.getItem("semkat_welcome_back_current_load");
      if (!shownThisLoad) {
        setShowWelcomeBack(true);
        sessionStorage.setItem("semkat_welcome_back_current_load", "true");
      }
    }
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
