import React, { useCallback, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, ScanLine, Upload, X } from "lucide-react";
import { parseBoardingPass } from "../data/boardingPassParser.js";
import { useJourney } from "../context/JourneyContext.jsx";

// Drag-drop / click-to-upload card that runs OCR locally on the browser
// (Tesseract.js, no backend) and pushes the extracted boarding-pass
// fields into JourneyContext.flight.

export default function BoardingPassUpload({ onComplete }) {
  const { setFlight, setToast, persistFlight } = useJourney();
  const inputRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | scanning | done | error
  const [progress, setProgress] = useState(0);
  const [extracted, setExtracted] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setState("idle");
    setProgress(0);
    setExtracted(null);
    setErrorMsg("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const runOcr = useCallback(async (file) => {
    if (!file) return;
    setState("scanning");
    setProgress(0);
    setErrorMsg("");
    setPreviewUrl(URL.createObjectURL(file));

    try {
      // Lazy-load tesseract.js so the rest of the bundle isn't penalised.
      const { default: Tesseract } = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "eng", {
        logger: (msg) => {
          if (msg.status === "recognizing text" && typeof msg.progress === "number") {
            setProgress(Math.round(msg.progress * 100));
          }
        },
      });
      const text = result?.data?.text || "";
      const fields = parseBoardingPass(text);

      setExtracted({ fields, raw: text });

      if (Object.keys(fields).length === 0) {
        setState("error");
        setErrorMsg("Couldn't detect any boarding-pass fields. Try a sharper photo or a PDF screenshot.");
        return;
      }

      // Apply parsed fields to global flight state, then persist the merged
      // record to the on-disk user store so future sessions / the backend
      // /query endpoint pick up the same passenger context.
      setFlight((current) => {
        const merged = {
          ...current,
          number: fields.number || current.number,
          from: fields.from || current.from,
          to: fields.to || current.to,
          gate: fields.gate || current.gate,
          boarding: fields.boarding || current.boarding,
          departure: fields.departure || current.departure,
          seat: fields.seat || current.seat,
          date: fields.date || current.date,
          pnr: fields.pnr || current.pnr,
          passenger: fields.passenger || current.passenger,
        };
        persistFlight?.(merged, "ocr");
        return merged;
      });

      setState("done");
      setToast(`Boarding pass scanned · ${fields.number || "flight"}${fields.gate ? ` · Gate ${fields.gate}` : ""}.`);
      onComplete?.(fields);
    } catch (err) {
      setState("error");
      setErrorMsg(err?.message || "OCR failed. Please try a different photo.");
    }
  }, [setFlight, setToast, onComplete]);

  const onPick = (event) => {
    const file = event.target.files?.[0];
    if (file) runOcr(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) runOcr(file);
  };

  return (
    <div className="boarding-upload">
      {state === "idle" && (
        <div
          className="boarding-drop"
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="boarding-drop-icon"><ScanLine size={36} /></div>
          <div className="boarding-drop-copy">
            <strong>Scan your boarding pass</strong>
            <span>Drag a photo here, or click to choose. Everything stays on this device.</span>
          </div>
          <div className="boarding-drop-actions">
            <button type="button" className="boarding-btn primary"><Upload size={18} /> Choose photo</button>
            <button
              type="button"
              className="boarding-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (inputRef.current) {
                  inputRef.current.setAttribute("capture", "environment");
                  inputRef.current.click();
                }
              }}
            >
              <Camera size={18} /> Use camera
            </button>
          </div>
        </div>
      )}

      {state === "scanning" && (
        <div className="boarding-progress">
          <Loader2 size={36} className="spin" />
          <strong>Reading your boarding pass…</strong>
          <div className="boarding-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="boarding-progress-pct">{progress}%</span>
          {previewUrl && <img src={previewUrl} alt="Boarding pass preview" />}
        </div>
      )}

      {state === "done" && extracted && (
        <div className="boarding-result">
          <div className="boarding-result-head">
            <CheckCircle2 size={26} />
            <strong>Boarding pass scanned</strong>
            <button type="button" className="boarding-btn ghost" onClick={reset} aria-label="Scan another"><X size={18} /></button>
          </div>
          <dl>
            {extracted.fields.passenger && (<><dt>Passenger</dt><dd>{extracted.fields.passenger}</dd></>)}
            {extracted.fields.number && (<><dt>Flight</dt><dd>{extracted.fields.number}</dd></>)}
            {extracted.fields.from && (<><dt>From</dt><dd>{extracted.fields.from}</dd></>)}
            {extracted.fields.to && (<><dt>To</dt><dd>{extracted.fields.to}</dd></>)}
            {extracted.fields.date && (<><dt>Date</dt><dd>{extracted.fields.date}</dd></>)}
            {extracted.fields.boarding && (<><dt>Boarding</dt><dd>{extracted.fields.boarding}</dd></>)}
            {extracted.fields.departure && (<><dt>Departure</dt><dd>{extracted.fields.departure}</dd></>)}
            {extracted.fields.gate && (<><dt>Gate</dt><dd>{extracted.fields.gate}</dd></>)}
            {extracted.fields.seat && (<><dt>Seat</dt><dd>{extracted.fields.seat}</dd></>)}
            {extracted.fields.pnr && (<><dt>PNR</dt><dd>{extracted.fields.pnr}</dd></>)}
          </dl>
          <button type="button" className="boarding-btn" onClick={reset}>Scan another pass</button>
        </div>
      )}

      {state === "error" && (
        <div className="boarding-error">
          <strong>Couldn't read the boarding pass</strong>
          <span>{errorMsg}</span>
          <button type="button" className="boarding-btn primary" onClick={reset}>Try again</button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onPick}
        style={{ display: "none" }}
      />
    </div>
  );
}
