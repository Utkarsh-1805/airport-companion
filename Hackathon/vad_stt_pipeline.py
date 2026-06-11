import torch
import pyaudio
import numpy as np
from faster_whisper import WhisperModel
import warnings

# --- Suppress Harmless Math Warnings from Apple Silicon ---
warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", message=".*FP16 is not supported.*")

# --- 1. Load Models ---
print("Loading Silero VAD... 🧠")
vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad', force_reload=False, trust_repo=True)

print("Loading Whisper (Base English)... 👂")
whisper_model = WhisperModel("base.en", device="cpu", compute_type="float32")

# --- 2. PyAudio Configuration ---
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 512

audio = pyaudio.PyAudio()
stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)

print("\n🎤 Ready! Ask for directions. (Press Ctrl+C to stop)\n")

is_recording = False
audio_buffer = []
silence_counter = 0
SILENCE_TOLERANCE = 15 

try:
    while True:
        data = stream.read(CHUNK, exception_on_overflow=False)
        audio_int16 = np.frombuffer(data, dtype=np.int16).copy()
        audio_tensor = torch.from_numpy(audio_int16).float() / 32768.0
        
        speech_prob = vad_model(audio_tensor, RATE).item()
        
        if speech_prob > 0.6:
            if not is_recording:
                print("\r🟢 Listening...                             ", end="")
                is_recording = True
            audio_buffer.append(data)
            silence_counter = 0
            
        elif is_recording:
            silence_counter += 1
            audio_buffer.append(data) 
            
            if silence_counter > SILENCE_TOLERANCE:
                print("\r⏳ Transcribing...                          ", end="")
                is_recording = False
                
                raw_audio = b''.join(audio_buffer)
                audio_np = np.frombuffer(raw_audio, dtype=np.int16).astype(np.float32) / 32768.0
                
                # Transcribe!
                segments_generator, info = whisper_model.transcribe(audio_np, beam_size=5)
                
                # Convert generator to list and filter out high no_speech_prob segments
                segments = list(segments_generator)
                valid_text = [
                    segment.text for segment in segments 
                    if segment.no_speech_prob < 0.6  # FIX: Attached to the segment!
                ]
                
                transcription = "".join(valid_text).strip()
                
                if transcription:
                    print(f"\r👤 You said: '{transcription}'" + " " * 20)
                else:
                    print("\r👻 (Ignored background noise)" + " " * 20)
                
                audio_buffer = []
                silence_counter = 0
                print("\n🎤 Ready for next query...")

except KeyboardInterrupt:
    print("\n🛑 Stopping...")
finally:
    stream.stop_stream()
    stream.close()
    audio.terminate()
    