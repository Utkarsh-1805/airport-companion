import React from "react";
import { Coffee, Languages, User, Volume2 } from "lucide-react";
import { useJourney } from "../context/JourneyContext.jsx";

export default function ProfilePage() {
  const { language, setLanguage, largeText, setLargeText } = useJourney();

  return (
    <section className="profile panel page-enter">
      <h1>Profile</h1>
      <p>Saved preferences keep the assistant personal without needing cloud inference.</p>
      <div className="preference-grid">
        <div><User size={22} /><strong>Travel style</strong><span>First-time assistance, low-stress routing</span></div>
        <div><Coffee size={22} /><strong>Food preference</strong><span>Vegetarian, quick pickup, coffee nearby</span></div>
        <label className="select-card"><Languages size={22} /><strong>Language</strong><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Hindi</option><option>Tamil</option><option>Telugu</option><option>Bengali</option><option>Marathi</option><option>Kannada</option><option>Gujarati</option><option>Malayalam</option><option>Punjabi</option><option>Arabic</option><option>French</option><option>Spanish</option><option>German</option></select></label>
        <button className={largeText ? "toggle enabled" : "toggle"} onClick={() => setLargeText(!largeText)}>
          <Volume2 size={22} />
          <strong>Accessibility mode</strong>
          <span>{largeText ? "Large text enabled" : "Standard text"}</span>
        </button>
      </div>
    </section>
  );
}
