import React, { useEffect, useRef } from "react";
import { Check, Mic, MicOff, Pause, Plus, Send, Volume2 } from "lucide-react";
import { useJourney } from "../context/JourneyContext.jsx";

export default function AICompanion() {
  const {
    voiceState,
    cycleVoice,
    query,
    setQuery,
    submitQuestion,
    conversation,
    isThinking,
    voiceTranscript,
    voiceEnabled,
    itinerary,
    addToItinerary,
    setMapOpen,
    setRouteDestination,
  } = useJourney();

  const isListening = voiceState === "listening" || voiceState === "processing";
  const isSpeaking = voiceState === "speaking";

  const transcriptRef = useRef(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation, isThinking]);

  return (
    <section className={`panel companion ${voiceState}`}>
      <span className="ghost-title">Concierge</span>
      <div className="transcript" ref={transcriptRef}>
        <span>Conversation</span>
        {voiceTranscript && (
          <p className="live-voice">
            <b>Listening</b>
            {voiceTranscript}
          </p>
        )}
        <div className="message-stack">
          {conversation.map((message, index) => {
            if (message.role === "system") {
              return (
                <p key={`system-${index}`} className="system realtime-note">
                  <b>Live</b>
                  {message.content}
                </p>
              );
            }
            return (
              <p key={`${message.role}-${index}`} className={message.role}>
                <b>{message.role === "assistant" ? "AI" : "You"}</b>
                {message.content}
                {Array.isArray(message.actions) && message.actions.length > 0 && (
                  <span className="ai-actions">
                    {message.actions.map((action) => {
                      if (action.type === "add_to_itinerary") {
                        const already = itinerary.some((i) => i.id === action.payload?.id);
                        return (
                          <button
                            key={action.id}
                            type="button"
                            className={`ai-action ${already ? "added" : ""}`}
                            disabled={already}
                            onClick={() => addToItinerary(action.payload)}
                            aria-label={already ? "Already in itinerary" : `Add ${action.label} to itinerary`}
                          >
                            {already ? <Check size={14} /> : <Plus size={14} />}
                            <span>{already ? action.label.replace(/^\+\s*/, "") + " · saved" : action.label}</span>
                          </button>
                        );
                      }
                      if (action.type === "show_on_map") {
                        return (
                          <button
                            key={action.id}
                            type="button"
                            className="ai-action map"
                            onClick={() => {
                              if (action.nodeId) setRouteDestination(action.nodeId);
                              setMapOpen(true);
                            }}
                            aria-label={`Show ${action.label} on the map`}
                          >
                            <span>{action.label}</span>
                          </button>
                        );
                      }
                      return null;
                    })}
                  </span>
                )}
                {Array.isArray(message.toolCalls) && message.toolCalls.length > 0 && (
                  <span className="tool-trace">
                    {message.toolCalls.map((call, idx) => (
                      <span key={`${call.name}-${idx}`} className="tool-chip">
                        → {call.name}
                        {Object.keys(call.args || {}).length
                          ? `(${Object.entries(call.args)
                              .map(([k, v]) => `${k}=${v}`)
                              .join(", ")})`
                          : "()"}
                        {call.summary ? ` · ${call.summary}` : ""}
                      </span>
                    ))}
                  </span>
                )}
              </p>
            );
          })}
          {isThinking && (
            <p className="assistant">
              <b>AI</b>
              Checking terminal maps...
            </p>
          )}
        </div>
      </div>
      {(isListening || isSpeaking) && (
        <div className="waveform" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => <i key={index} />)}
        </div>
      )}
      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          if (!query.trim()) return;
          submitQuestion(query);
          setQuery("");
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isListening ? "Listening..." : "Ask the concierge..."}
          disabled={isListening}
        />
        <button
          type="button"
          className={`mic-inline ${voiceState}`}
          onClick={cycleVoice}
          aria-label={isSpeaking ? "Stop speaking" : isListening ? "Stop listening" : "Start voice"}
          title={voiceEnabled ? "Voice" : "Voice disabled"}
        >
          {isSpeaking ? <Pause size={18} /> : !voiceEnabled ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button type="submit" className="send-inline" aria-label="Send message" disabled={!query.trim()}>
          <Send size={18} />
        </button>
      </form>
      <p className="voice-label">
        {isThinking
          ? "Thinking..."
          : isSpeaking
            ? "Speaking - tap mic to interrupt"
            : isListening
              ? `${voiceState}...`
              : "Type or tap the mic to ask"}
        {voiceEnabled && <Volume2 size={14} />}
      </p>
    </section>
  );
}
