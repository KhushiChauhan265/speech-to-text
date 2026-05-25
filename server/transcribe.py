import whisper
import sys

model = whisper.load_model("base")

audio_path = sys.argv[1]

result = model.transcribe(
    audio_path,
    language="en",
    temperature=0,
    fp16=False
)

print(result["text"])