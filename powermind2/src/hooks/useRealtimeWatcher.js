import { useEffect, useRef, useState } from "react";

const REALTIME_ENDPOINT = import.meta.env.VITE_AEROASSIST_API
  ? import.meta.env.VITE_AEROASSIST_API.replace(/\/query\/?$/, "/realtime")
  : "http://127.0.0.1:8000/realtime";

const POLL_INTERVAL_MS = 10000;

/**
 * Polls the backend's /realtime endpoint, diffs each snapshot against the
 * previous one, and fires `onChange` with a list of human-readable strings
 * whenever flights / security / shop wait values shift. The hook returns
 * the latest snapshot so the UI can render a "live" panel if it wants to.
 *
 * The first successful fetch is treated as the baseline, not a change, so
 * the user does not get a flood of "AI203 is On Time" notifications on load.
 */
export function useRealtimeWatcher({ onChange, enabled = true } = {}) {
  const [snapshot, setSnapshot] = useState(null);
  const [etag, setEtag] = useState(null);
  const [error, setError] = useState(null);
  const previousRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let timeoutId = null;
    let currentEtag = null;

    const tick = async () => {
      try {
        const headers = currentEtag ? { "If-None-Match": currentEtag } : {};
        const res = await fetch(REALTIME_ENDPOINT, {
          method: "GET",
          headers,
          cache: "no-store",
        });

        if (res.status === 304) {
          // unchanged - reschedule and return
          if (!cancelled) timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
          return;
        }

        if (!res.ok) throw new Error(`realtime fetch ${res.status}`);
        const data = await res.json();
        const nextEtag = res.headers.get("ETag") || data.etag || null;
        const nextSnapshot = data.snapshot || data;

        if (cancelled) return;

        const previous = previousRef.current;
        if (previous && nextEtag !== currentEtag) {
          const diffs = diffSnapshots(previous, nextSnapshot);
          if (diffs.length && onChangeRef.current) {
            onChangeRef.current(diffs, nextSnapshot);
          }
        }

        previousRef.current = nextSnapshot;
        currentEtag = nextEtag;
        setSnapshot(nextSnapshot);
        setEtag(nextEtag);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enabled]);

  return { snapshot, etag, error };
}

/**
 * Compare two realtime snapshots and return a list of plain-English change
 * strings. Tuned to surface the things passengers actually care about:
 * flight status flips, gate moves, delay updates, and big queue swings.
 */
function diffSnapshots(previous, next) {
  const out = [];

  // Flights: index by number for stable diffs even if order changes.
  const prevFlights = indexBy(previous?.flights, "number");
  const nextFlights = indexBy(next?.flights, "number");
  for (const [number, nf] of Object.entries(nextFlights)) {
    const pf = prevFlights[number];
    if (!pf) {
      out.push(`New flight on the board: ${number} to ${nf.destination_city || nf.destination_code} from gate ${nf.gate}.`);
      continue;
    }
    if (pf.status !== nf.status) {
      out.push(`${number} status: ${pf.status} → ${nf.status}.`);
    }
    if (pf.gate !== nf.gate) {
      out.push(`${number} gate change: ${pf.gate} → ${nf.gate}.`);
    }
    if ((pf.delay_minutes || 0) !== (nf.delay_minutes || 0)) {
      out.push(`${number} delay: ${pf.delay_minutes || 0}m → ${nf.delay_minutes || 0}m.`);
    }
    if ((pf.boarding_time || "") !== (nf.boarding_time || "")) {
      out.push(`${number} boarding time: ${pf.boarding_time || "—"} → ${nf.boarding_time || "—"}.`);
    }
  }
  for (const number of Object.keys(prevFlights)) {
    if (!nextFlights[number]) out.push(`${number} removed from the board.`);
  }

  // Security: only call out >=3 minute swings to avoid noisy spam.
  const prevSec = indexBy(previous?.security_wait, "checkpoint_id");
  const nextSec = indexBy(next?.security_wait, "checkpoint_id");
  for (const [id, ns] of Object.entries(nextSec)) {
    const ps = prevSec[id];
    if (!ps) continue;
    const delta = (ns.wait_minutes || 0) - (ps.wait_minutes || 0);
    if (Math.abs(delta) >= 3) {
      const arrow = delta > 0 ? "↑" : "↓";
      out.push(`${ns.checkpoint_name}: ${ps.wait_minutes}m ${arrow} ${ns.wait_minutes}m.`);
    }
  }

  // Shop wait: only call out crossings (e.g. short → long) or >=3 min swings.
  const prevShops = indexBy(previous?.shop_wait, "id");
  const nextShops = indexBy(next?.shop_wait, "id");
  for (const [id, ns] of Object.entries(nextShops)) {
    const ps = prevShops[id];
    if (!ps) continue;
    if (ps.queue_state !== ns.queue_state) {
      out.push(`${ns.name}: queue ${ps.queue_state} → ${ns.queue_state}.`);
    }
  }

  return out;
}

function indexBy(list, key) {
  const out = {};
  if (!Array.isArray(list)) return out;
  for (const item of list) {
    if (item && item[key] != null) out[item[key]] = item;
  }
  return out;
}
