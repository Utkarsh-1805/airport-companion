import React from "react";
import AICompanion from "../components/AICompanion.jsx";
import SmartServices from "../components/SmartServices.jsx";
import TimelinePanel from "../components/TimelinePanel.jsx";

export default function HomePage() {
  return (
    <section className="home-grid page-enter">
      <TimelinePanel />
      <AICompanion />
      <SmartServices />
    </section>
  );
}
