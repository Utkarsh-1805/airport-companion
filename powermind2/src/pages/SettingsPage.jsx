import React from "react";
import { Accessibility, Cpu, HeartHandshake, Languages, Mic, ScanLine, Volume2 } from "lucide-react";
import { useJourney } from "../context/JourneyContext.jsx";
import BoardingPassUpload from "../components/BoardingPassUpload.jsx";

const LLM_OPTIONS = [
  { value: "gemma2:9b",  label: "Gemma 2 · 9B (fast default, ~6 GB)" },
  { value: "gemma2:2b",  label: "Gemma 2 · 2B (lightest, ~2 GB)" },
  { value: "gemma2:27b", label: "Gemma 2 · 27B (high quality, ~16 GB)" },
  { value: "gemma4:e2b", label: "Gemma 4 · E2B (fastest, ~7 GB)" },
  { value: "gemma2:9b", label: "Gemma 4 · E4B (balanced, ~10 GB)" },
  { value: "gemma4:26b", label: "Gemma 4 · 26B (high quality, ~18 GB)" },
  { value: "gemma4:31b", label: "Gemma 4 · 31B (max quality, ~20 GB)" },
  { value: "gemma3:4b",  label: "Gemma 3 · 4B (legacy)" },
  { value: "gemma3n:e2b", label: "Gemma 3n · E2B (legacy on-device)" },
  { value: "gemma3n:e4b", label: "Gemma 3n · E4B (legacy on-device)" },
];

export default function SettingsPage() {
  const { voiceEnabled, setVoiceEnabled, voiceOnly, setVoiceOnly, language, setLanguage, largeText, setLargeText, llmModel, setLlmModel, elderlyMode, setElderlyMode } = useJourney();

  return (
    <section className="profile panel page-enter">
      <h1>Settings</h1>
      <p>Controls for voice, language, and accessibility in the airport flow.</p>
      <div className="preference-grid">
        <button className={voiceEnabled ? "toggle enabled" : "toggle"} onClick={() => setVoiceEnabled(!voiceEnabled)}>
          <Mic size={22} />
          <strong>Voice output</strong>
          <span>{voiceEnabled ? "On" : "Off"}</span>
        </button>
        <label className="select-card">
          <Cpu size={22} />
          <strong>Local LLM</strong>
          <select value={llmModel} onChange={(event) => setLlmModel(event.target.value)}>
            {LLM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="select-card"><Languages size={22} /><strong>Language</strong><select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English</option><option>Hindi</option><option>Tamil</option><option>Telugu</option><option>Bengali</option><option>Marathi</option><option>Kannada</option><option>Gujarati</option><option>Malayalam</option><option>Punjabi</option><option>Arabic</option><option>French</option><option>Spanish</option><option>German</option></select></label>
        <button className={largeText ? "toggle enabled" : "toggle"} onClick={() => setLargeText(!largeText)}>
          <Accessibility size={22} />
          <strong>Large text</strong>
          <span>{largeText ? "Enabled" : "Disabled"}</span>
        </button>
        <button className={voiceOnly ? "toggle enabled" : "toggle"} onClick={() => setVoiceOnly(!voiceOnly)}>
          <Volume2 size={22} />
          <strong>Voice-only mode</strong>
          <span>{voiceOnly ? "Enabled" : "Disabled"}</span>
        </button>
        <button className={elderlyMode ? "toggle enabled" : "toggle"} onClick={() => setElderlyMode(!elderlyMode)}>
          <HeartHandshake size={22} />
          <strong>Easy Mode</strong>
          <span>{elderlyMode ? "On — bigger, calmer, voice on" : "Off"}</span>
        </button>
      </div>

      <div className="settings-section">
        <h2><ScanLine size={20} /> Boarding pass</h2>
        <p>Scan once and we'll fill in your flight, gate, seat, and timings — entirely on this device.</p>
        <BoardingPassUpload />
      </div>
    </section>
  );
}
