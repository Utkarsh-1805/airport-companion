import torch
import pyaudio
import numpy as np

# --- 1. Load Silero VAD Model ---
print("Loading Silero VAD model... 🧠")
# torch.hub downloads the model and caches it locally
model, utils = torch.hub.load(
    repo_or_dir='snakers4/silero-vad',
    model='silero_vad',
    force_reload=False,
    trust_repo=True
)

# --- 2. PyAudio Configuration ---
# Silero expects exactly 16kHz, mono channel audio
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 512  # 512 frames = ~32ms of audio

audio = pyaudio.PyAudio()

# Open the microphone stream
stream = audio.open(
    format=FORMAT,
    channels=CHANNELS,
    rate=RATE,
    input=True,
    frames_per_buffer=CHUNK
)

print("\n🎤 Microphone active. Start speaking... (Press Ctrl+C to stop)\n")

try:
    while True:
        # Read a chunk of audio from the mic
        data = stream.read(CHUNK, exception_on_overflow=False)
        
        # Convert raw byte data to a numpy array, then to a PyTorch tensor
        audio_int16 = np.frombuffer(data, dtype=np.int16).copy()
        # Normalize the audio to float32 between -1.0 and 1.0 (Silero requirement)
        audio_tensor = torch.from_numpy(audio_int16).float() / 32768.0
        
        # Pass the chunk to the VAD model to get a probability (0.0 to 1.0)
        speech_prob = model(audio_tensor, RATE).item()
        
        # Determine if speech is present based on a confidence threshold
        if speech_prob > 0.6:
            # We use carriage return (\r) to overwrite the same line in the terminal
            print(f"\r🗣️ Speech detected! (Confidence: {speech_prob:.2f})  ", end="")
        else:
            print(f"\r... Silence ...                                     ", end="")
            
except KeyboardInterrupt:
    print("\n\n🛑 Stopping audio stream...")
finally:
    stream.stop_stream()
    stream.close()
    audio.terminate()