import argparse
import difflib
import logging
import os
import platform
import queue
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import warnings
import wave
from pathlib import Path

import numpy as np
import ollama
import torch
from faster_whisper import WhisperModel
from kokoro import KPipeline

sys.path.insert(0, str(Path(__file__).parent / "config"))
try:
    from src.rag import AeroAssistRAG
    from src.prompt_engine import clean_for_tts
except ImportError:
    pass
import json


warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", module="urllib3")
logging.getLogger("kokoro").setLevel(logging.ERROR)


FORMAT_RATE = 16000
CHANNELS = 1
CHUNK = 512
TTS_RATE = 24000
SILENCE_TOLERANCE = 15         # default chunks of silence before STT fires
SILENCE_TOLERANCE_QUICK = 8   # reduced tolerance when assistant just asked a question
SPEECH_THRESHOLD = 0.6
DEFAULT_OLLAMA_MODEL = os.getenv("VOICE_PIPELINE_LLM", "gemma2:9b")
CHUNK_SECONDS = CHUNK / FORMAT_RATE

# Import STT log-prob threshold from config (falls back to safe default)
try:
    from config.settings import STT_LOG_PROB_THRESHOLD
    from config.settings import STT_LOG_PROB_FLOOR
except ImportError:
    STT_LOG_PROB_THRESHOLD = -1.0
    STT_LOG_PROB_FLOOR = -2.0


class MacOSDuplexStream:
    def __init__(self, input_rate, chunk, output_rate):
        helper = Path(__file__).with_name("macos_duplex_stream.swift")
        if not helper.exists():
            raise RuntimeError(f"Missing duplex helper: {helper}")

        self._bytes_per_chunk = chunk * 2
        self._pending = bytearray()
        self._process = subprocess.Popen(
            ["/usr/bin/swift", str(helper), str(input_rate), str(chunk), str(output_rate)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=sys.stderr,
            bufsize=0,
        )

    def read(self, _chunk, exception_on_overflow=False):
        while len(self._pending) < self._bytes_per_chunk:
            if self._process.poll() is not None:
                raise RuntimeError(
                    f"Duplex helper exited with code {self._process.returncode}."
                )
            piece = self._process.stdout.read(self._bytes_per_chunk - len(self._pending))
            if not piece:
                time.sleep(0.01)
                continue
            self._pending.extend(piece)

        data = bytes(self._pending[: self._bytes_per_chunk])
        del self._pending[: self._bytes_per_chunk]
        return data

    def play(self, audio_chunk):
        audio_np = tensor_to_numpy(audio_chunk)
        audio_int16 = np.clip(audio_np, -1.0, 1.0)
        audio_int16 = (audio_int16 * 32767).astype(np.int16)
        raw_data = audio_int16.tobytes()
        
        size = len(raw_data)
        import struct
        header = b"PLAY" + struct.pack("<I", size)
        
        try:
            self._process.stdin.write(header + raw_data)
            self._process.stdin.flush()
        except OSError:
            pass

    def interrupt(self):
        try:
            self._process.stdin.write(b"FLSH")
            self._process.stdin.flush()
        except OSError:
            pass

    def close(self):
        if self._process.poll() is None:
            self._process.terminate()
            try:
                self._process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self._process.kill()


class PyAudioMicStream:
    def __init__(self, rate, chunk):
        import pyaudio

        self._pyaudio = pyaudio
        self._audio = pyaudio.PyAudio()
        self._stream = self._audio.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=rate,
            input=True,
            frames_per_buffer=chunk,
        )

    def read(self, chunk, exception_on_overflow=False):
        return self._stream.read(chunk, exception_on_overflow=exception_on_overflow)

    def close(self):
        self._stream.stop_stream()
        self._stream.close()
        self._audio.terminate()


class AfplaySpeaker:
    def __init__(self, rate):
        if not shutil.which("afplay"):
            raise RuntimeError("afplay is required for speaker output on macOS.")
        self._rate = rate
        self._current = None

    def play(self, audio_chunk, interruption_event):
        audio_np = tensor_to_numpy(audio_chunk)
        audio_int16 = np.clip(audio_np, -1.0, 1.0)
        audio_int16 = (audio_int16 * 32767).astype(np.int16)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
            wav_path = wav_file.name

        try:
            with wave.open(wav_path, "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(self._rate)
                wav.writeframes(audio_int16.tobytes())

            self._current = subprocess.Popen(
                ["afplay", wav_path],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            while self._current.poll() is None:
                if interruption_event.is_set():
                    self._current.terminate()
                    break
                time.sleep(0.02)
        finally:
            if self._current and self._current.poll() is None:
                self._current.kill()
            self._current = None
            try:
                os.unlink(wav_path)
            except OSError:
                pass

    def close(self):
        if self._current and self._current.poll() is None:
            self._current.terminate()


class AssistantOutputState:
    def __init__(self, grace_seconds):
        self._lock = threading.Lock()
        self._active = threading.Event()
        self._grace_seconds = grace_seconds
        self._active_until = 0.0
        self._recent_text = ""

    def mark_active(self):
        self._active.set()

    def mark_inactive_soon(self):
        with self._lock:
            self._active_until = time.monotonic() + self._grace_seconds
        self._active.clear()

    def is_active(self):
        with self._lock:
            return self._active.is_set() or time.monotonic() < self._active_until

    def add_text(self, text):
        normalized = " ".join(text.split())
        if not normalized:
            return
        with self._lock:
            combined = f"{self._recent_text} {normalized}".strip()
            self._recent_text = combined[-1200:]

    def recent_text(self):
        with self._lock:
            return self._recent_text


def tensor_to_numpy(audio_chunk):
    if hasattr(audio_chunk, "detach"):
        audio_chunk = audio_chunk.detach().cpu().numpy()
    return np.asarray(audio_chunk, dtype=np.float32)


def audio_rms(audio_int16):
    if len(audio_int16) == 0:
        return 0.0
    audio_float = audio_int16.astype(np.float32) / 32768.0
    return float(np.sqrt(np.mean(np.square(audio_float))))


def word_count(text):
    return len(re.findall(r"[a-zA-Z0-9']+", text))


def normalize_for_overlap(text):
    words = re.findall(r"[a-zA-Z0-9']+", text.lower())
    return " ".join(words)


def looks_like_assistant_echo(transcription, assistant_text):
    user = normalize_for_overlap(transcription)
    assistant = normalize_for_overlap(assistant_text)
    if not user or not assistant:
        return False

    if len(user) >= 10 and user in assistant:
        return True

    user_words = set(user.split())
    assistant_words = set(assistant.split())
    if user_words:
        overlap = len(user_words & assistant_words) / len(user_words)
        if overlap >= 0.75 and len(user_words) <= 8:
            return True

    recent_assistant = assistant[-max(120, len(user) * 4) :]
    return difflib.SequenceMatcher(None, user, recent_assistant).ratio() >= 0.58


def installed_ollama_models():
    return [model.model for model in ollama.list().models]


def resolve_ollama_model(requested):
    models = installed_ollama_models()
    if requested in models:
        return requested
    if DEFAULT_OLLAMA_MODEL in models:
        print(f"Ollama model '{requested}' is not installed; using '{DEFAULT_OLLAMA_MODEL}'.")
        return DEFAULT_OLLAMA_MODEL
    chat_models = [model for model in models if "embed" not in model]
    if chat_models:
        fallback = chat_models[0]
        print(f"Ollama model '{requested}' is not installed; using '{fallback}'.")
        return fallback
    raise RuntimeError("No Ollama chat model is installed. Try: ollama pull gemma2:9b")


def get_backend(requested):
    if requested == "auto":
        return "macos" if platform.system() == "Darwin" else "pyaudio"
    return requested


def clear_audio_queue(audio_queue):
    """Drain all pending audio chunks without playing them."""
    while True:
        try:
            audio_queue.get_nowait()
            audio_queue.task_done()
        except queue.Empty:
            return


def audio_playback_worker(audio_queue, speaker, interruption_event, assistant_state):
    """
    Dedicated thread that pulls audio chunks and plays them.
    Checks interruption_event before every chunk — if set, drops
    the chunk silently so stale audio never reaches the speaker.
    """
    while True:
        item = audio_queue.get()
        try:
            if item is None:
                return  # Shutdown sentinel
            audio_chunk, gen_id, state_bag = item
            # Drop chunk if generation has been superseded
            if gen_id != state_bag.get("generation_id", gen_id):
                continue
            if interruption_event.is_set():
                continue
            assistant_state.mark_active()
            if hasattr(speaker, "interrupt"):
                speaker.play(audio_chunk)
            else:
                speaker.play(audio_chunk, interruption_event)
            assistant_state.mark_inactive_soon()
        finally:
            audio_queue.task_done()


def _is_cancelled(interruption_event, gen_id, state_bag):
    """Check if this generation has been superseded or interrupted."""
    if interruption_event.is_set():
        return True
    if state_bag and gen_id != state_bag.get("generation_id", gen_id):
        return True
    return False


def stream_llm_and_chunk(
    user_text,
    rag_system,
    tts_pipeline_holder,
    audio_queue,
    ai_speaking_event,
    interruption_event,
    assistant_state,
    state_bag=None,
    stt_confidence=1.0,
):
    """
    Stream tokens from the LLM, chunk by sentence boundary, TTS each
    sentence, and enqueue audio for playback.

    Cancellation: checks both interruption_event AND generation_id.
    If a new query starts (incrementing generation_id), this thread
    silently exits even if the old HTTP stream is still producing tokens.
    """
    # Capture our generation ID at entry — if it changes, we're stale
    gen_id = state_bag.get("generation_id", 0) if state_bag else 0

    ai_speaking_event.set()
    interruption_event.clear()

    print("\nAI is thinking...\nAI says: ", end="", flush=True)

    full_response = ""
    try:
        user_data = {
            "flight_id": "AI-101",
            "gate": "B12",
            "boarding_time": "23:30",
            "status": "On-time",
        }
        llm_stream = rag_system.stream_response(
            user_id="traveler_01",
            query=user_text,
            user_data=user_data,
            include_user_docs=False,
            # stt_confidence=stt_confidence, # Removed since rag.py was reverted
        )

        current_sentence = ""
        for chunk in llm_stream:
            if _is_cancelled(interruption_event, gen_id, state_bag):
                print("\n[Interrupted by user!]")
                break

            token = chunk
            print(token, end="", flush=True)
            current_sentence += token
            full_response += token

            if any(char in token for char in [".", "?", "!"]):
                if _is_cancelled(interruption_event, gen_id, state_bag):
                    break
                enqueue_tts(
                    current_sentence,
                    tts_pipeline_holder,
                    audio_queue,
                    interruption_event,
                    assistant_state,
                    gen_id,
                    state_bag,
                )
                current_sentence = ""

        if not _is_cancelled(interruption_event, gen_id, state_bag):
            enqueue_tts(
                current_sentence, tts_pipeline_holder, audio_queue,
                interruption_event, assistant_state, gen_id, state_bag,
            )
        print("\n")

        # Signal clarification mode
        if state_bag is not None:
            last_char = full_response.rstrip()[-1] if full_response.rstrip() else ""
            state_bag["awaiting_answer"] = (last_char == "?")

    except Exception as exc:
        print(f"\nLLM/TTS error: {exc}")
    finally:
        # Only clear speaking state if we're still the active generation
        if not state_bag or gen_id == state_bag.get("generation_id", gen_id):
            ai_speaking_event.clear()
            assistant_state.mark_inactive_soon()


def enqueue_tts(text, tts_pipeline_holder, audio_queue, interruption_event,
                assistant_state, gen_id=0, state_bag=None):
    """
    Clean a sentence, synthesize TTS audio, and enqueue chunks for playback.
    Checks cancellation before every audio chunk enqueue.
    """
    try:
        clean_text = clean_for_tts(text.strip())
    except Exception:
        clean_text = text.strip()
    if not clean_text or _is_cancelled(interruption_event, gen_id, state_bag):
        return

    assistant_state.mark_active()

    # Lazy-load Kokoro TTS on first use
    if tts_pipeline_holder["pipeline"] is None:
        print("\nInitializing Kokoro TTS (first audio needed)...")
        tts_pipeline_holder["pipeline"] = KPipeline(lang_code="a")
        print("Kokoro TTS ready!")

    assistant_state.add_text(clean_text)
    generator = tts_pipeline_holder["pipeline"](clean_text, voice="af_bella", speed=1.0)

    try:
        for _, _, generated_audio in generator:
            if _is_cancelled(interruption_event, gen_id, state_bag):
                break
            audio_queue.put((generated_audio, gen_id, state_bag or {}))
    except Exception as e:
        print(f"TTS error: {e}")


def run_health_check(args):
    llm_model = resolve_ollama_model(args.model)
    print(f"Ollama model OK: {llm_model}")

    print("Loading Silero VAD...")
    torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        trust_repo=True,
    )
    print("Silero VAD OK")

    print("Loading Whisper...")
    WhisperModel("base.en", device="cpu", compute_type="float32")
    print("Whisper OK")

    print("Loading Kokoro...")
    tts_pipeline = KPipeline(lang_code="a")
    generator = tts_pipeline("Health check complete.", voice="af_bella", speed=1.0)
    for _, _, generated_audio in generator:
        print(f"Kokoro OK: {len(generated_audio)} samples")
        break

    if args.check_audio:
        print("Opening microphone. If macOS asks for permission, allow it.")
        backend = get_backend(args.audio_backend)
        if backend == "macos":
            mic_stream = MacOSDuplexStream(FORMAT_RATE, CHUNK, TTS_RATE)
        else:
            mic_stream = PyAudioMicStream(FORMAT_RATE, CHUNK)
        try:
            mic_stream.read(CHUNK, exception_on_overflow=False)
            print("Microphone OK")
        finally:
            mic_stream.close()


def run_pipeline(args):
    print("Loading AeroAssist RAG System...")
    rag_system = AeroAssistRAG()
    try:
        facilities_path = Path(__file__).parent / "config" / "data" / "airport_facilities.json"
        with open(facilities_path, "r") as f:
            facilities = json.load(f)
        rag_system.load_facilities(facilities)
        print(f"Loaded {len(facilities)} airport facilities.")
    except Exception as e:
        print(f"Failed to load facilities: {e}")

    print("Loading Silero VAD...")
    vad_model, _ = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        force_reload=False,
        trust_repo=True,
    )

    print("Loading Whisper (Base English)...")
    whisper_model = WhisperModel("base.en", device="cpu", compute_type="float32")

    # Defer Kokoro TTS loading to avoid startup hang
    print("Kokoro TTS will be loaded on first use (lazy loading)...")
    tts_pipeline_holder = {"pipeline": None}

    print("Opening microphone. If macOS asks for permission, allow it.")
    backend = get_backend(args.audio_backend)
    if backend == "macos":
        mic_stream = MacOSDuplexStream(FORMAT_RATE, CHUNK, TTS_RATE)
        speaker = mic_stream
    else:
        mic_stream = PyAudioMicStream(FORMAT_RATE, CHUNK)
        speaker = AfplaySpeaker(TTS_RATE)

    ai_speaking_event = threading.Event()
    interruption_event = threading.Event()
    assistant_state = AssistantOutputState(args.assistant_echo_grace)
    audio_queue = queue.Queue()
    playback_thread = threading.Thread(
        target=audio_playback_worker,
        args=(audio_queue, speaker, interruption_event, assistant_state),
        daemon=True,
    )
    playback_thread.start()

    print("\n" + "=" * 50)
    print("FULL DUPLEX VOICE AI ACTIVE! WEAR HEADPHONES")
    print("=" * 50)
    print("Speak now. Press Ctrl+C to stop.\n")

    is_recording = False
    audio_buffer = []
    dynamic_silence_tolerance = SILENCE_TOLERANCE  # updated per conversational state
    silence_counter = 0
    # Shared mutable state bag — used for inter-thread signalling
    # generation_id: monotonically increasing counter; stale threads check this to self-cancel
    state_bag = {"awaiting_answer": False, "generation_id": 0}


    try:
        while True:
            data = mic_stream.read(CHUNK, exception_on_overflow=False)
            audio_int16 = np.frombuffer(data, dtype=np.int16).copy()
            audio_tensor = torch.from_numpy(audio_int16).float() / 32768.0
            speech_prob = vad_model(audio_tensor, FORMAT_RATE).item()
            rms = audio_rms(audio_int16)
            assistant_busy = assistant_state.is_active() or ai_speaking_event.is_set()

            if assistant_busy and not is_recording:
                if (
                    not args.no_barge_in
                    and speech_prob > SPEECH_THRESHOLD
                    and rms >= args.barge_in_min_rms
                ):
                    # Immediate cancellation on detected user speech.
                    state_bag["generation_id"] = state_bag.get("generation_id", 0) + 1
                    interruption_event.set()
                    if hasattr(speaker, "interrupt"):
                        speaker.interrupt()
                    clear_audio_queue(audio_queue)
                    print("\rListening... (barge-in)                 ", end="", flush=True)
                    is_recording = True
                    audio_buffer = [data]
                    silence_counter = 0
                continue

            if speech_prob > SPEECH_THRESHOLD:
                if not is_recording:
                    print("\rListening...                             ", end="", flush=True)
                    is_recording = True
                audio_buffer.append(data)
                silence_counter = 0

            elif is_recording:
                silence_counter += 1
                audio_buffer.append(data)

                if silence_counter > dynamic_silence_tolerance:
                    print("\rTranscribing...                          ", end="", flush=True)
                    is_recording = False

                    raw_audio = b"".join(audio_buffer)
                    audio_np = np.frombuffer(raw_audio, dtype=np.int16).astype(np.float32) / 32768.0

                    segments_generator, _ = whisper_model.transcribe(audio_np, beam_size=5)
                    segments = list(segments_generator)

                    # --- STT Quality Gate ---
                    # Reject transcripts where Whisper itself is not confident.
                    # avg_logprob close to 0 means confident; below threshold means garbled.
                    valid_segments = [
                        s for s in segments
                        if s.no_speech_prob < 0.6
                        and (s.avg_logprob if hasattr(s, 'avg_logprob') else 0.0) >= STT_LOG_PROB_THRESHOLD
                    ]
                    transcription = "".join(s.text for s in valid_segments).strip()
                    avg_logprob = (
                        sum(s.avg_logprob for s in valid_segments) / len(valid_segments)
                        if valid_segments else STT_LOG_PROB_FLOOR
                    )
                    stt_confidence = max(
                        0.0,
                        min(1.0, (avg_logprob - STT_LOG_PROB_FLOOR) / (0.0 - STT_LOG_PROB_FLOOR)),
                    )

                    # Garbled audio: short word count AND high no-speech probability overall
                    is_garbled = (
                        len(segments) > 0
                        and not valid_segments
                        and all(s.no_speech_prob >= 0.6 for s in segments)
                    )

                    if (
                        transcription
                        and assistant_state.is_active()
                        and (
                            word_count(transcription) < args.min_interruption_words
                            or looks_like_assistant_echo(transcription, assistant_state.recent_text())
                        )
                    ):
                        interruption_event.clear()
                        print("\r(Ignored assistant echo)" + " " * 20)
                    elif is_garbled:
                        # Noise / unintelligible — ask user to repeat
                        print("\r(Garbled audio — requesting repeat)" + " " * 20)
                        state_bag["generation_id"] = state_bag.get("generation_id", 0) + 1
                        state_bag["awaiting_answer"] = True
                        enqueue_tts(
                            "Sorry, could you repeat that?",
                            tts_pipeline_holder,
                            audio_queue,
                            interruption_event,
                            assistant_state,
                            state_bag.get("generation_id", 0),
                            state_bag,
                        )
                    elif transcription:
                        print(f"\rYou asked: '{transcription}'" + " " * 20)
                        # Increment generation_id to invalidate any old LLM/TTS threads
                        state_bag["generation_id"] = state_bag.get("generation_id", 0) + 1
                        dynamic_silence_tolerance = SILENCE_TOLERANCE
                        threading.Thread(
                            target=stream_llm_and_chunk,
                            args=(
                                transcription,
                                rag_system,
                                tts_pipeline_holder,
                                audio_queue,
                                ai_speaking_event,
                                interruption_event,
                                assistant_state,
                                state_bag,
                                stt_confidence,
                            ),
                            daemon=True,
                        ).start()
                        # Dynamic silence tolerance: if assistant will ask a question, listen faster
                        # (state_bag is updated by the thread; read it after a brief yield)
                        # We update it reactively when the next recording cycle ends.
                        dynamic_silence_tolerance = (
                            SILENCE_TOLERANCE_QUICK if state_bag.get("awaiting_answer") else SILENCE_TOLERANCE
                        )

                    else:
                        print("\r(Ignored background noise)" + " " * 20)

                    audio_buffer = []
                    silence_counter = 0
                    print("Ready for next query...")

    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        audio_queue.put(None)  # Shutdown sentinel — playback_worker checks for None
        audio_queue.join()
        mic_stream.close()
        speaker.close()


def parse_args():
    parser = argparse.ArgumentParser(description="Full duplex airport voice assistant.")
    parser.add_argument("--model", default=DEFAULT_OLLAMA_MODEL, help="Ollama chat model to use.")
    parser.add_argument(
        "--audio-backend",
        choices=["auto", "macos", "pyaudio"],
        default="auto",
        help="Microphone backend. auto uses the macOS AVFoundation helper on macOS.",
    )
    parser.add_argument("--health-check", action="store_true", help="Load models and exit.")
    parser.add_argument("--check-audio", action="store_true", help="Include microphone open/read in health check.")
    parser.set_defaults(no_barge_in=False)
    parser.add_argument(
        "--barge-in",
        dest="no_barge_in",
        action="store_false",
        help="Enable fast interruption while assistant audio is active. This is the default.",
    )
    parser.add_argument(
        "--no-barge-in",
        dest="no_barge_in",
        action="store_true",
        help="Ignore microphone speech while assistant audio is active.",
    )
    parser.add_argument(
        "--barge-in-min-duration",
        type=float,
        default=0.35,
        help="Seconds of sustained speech required before interrupting assistant audio.",
    )
    parser.add_argument(
        "--barge-in-min-rms",
        type=float,
        default=0.025,
        help="Minimum microphone RMS required for barge-in while assistant audio is active.",
    )
    parser.add_argument(
        "--assistant-echo-grace",
        type=float,
        default=1.25,
        help="Seconds after assistant audio to keep filtering likely assistant echo.",
    )
    parser.add_argument(
        "--min-interruption-words",
        type=int,
        default=2,
        help="Minimum words required to accept speech captured during assistant output.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    parsed_args = parse_args()
    if parsed_args.health_check:
        run_health_check(parsed_args)
    else:
        run_pipeline(parsed_args)
