import React from "react";
import { AnimatePresence } from "framer-motion";
import AppShell from "./components/AppShell.jsx";
import DetailModal from "./components/DetailModal.jsx";
import FullMap from "./components/FullMap.jsx";
import Toast from "./components/Toast.jsx";
import { useJourney } from "./context/JourneyContext.jsx";
import ExplorePage from "./pages/ExplorePage.jsx";
import FaqPage from "./pages/FaqPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { useRouter } from "./router/RouterContext.jsx";

export default function App() {
  const { path } = useRouter();
  const { toast, closeToast, mapOpen, setMapOpen, selectedPlace, setSelectedPlace } = useJourney();
  const page = path === "/explore" ? <ExplorePage /> : path === "/faq" ? <FaqPage /> : path === "/profile" ? <ProfilePage /> : path === "/settings" ? <SettingsPage /> : <HomePage />;

  return (
    <div className="app">
      {path === "/" ? <OnboardingPage key="onboarding" /> : <AppShell key="shell">{page}</AppShell>}
      <AnimatePresence>{toast && <Toast text={toast} onClose={closeToast} />}</AnimatePresence>
      <AnimatePresence>{mapOpen && <FullMap onClose={() => setMapOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{selectedPlace && <DetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />}</AnimatePresence>
    </div>
  );
}
