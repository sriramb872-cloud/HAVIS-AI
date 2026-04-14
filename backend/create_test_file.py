import os
os.makedirs('uploads/videos', exist_ok=True)
with open('uploads/videos/test_playback.webm', 'wb') as f:
    f.write(b'x'*1024*1024)
print("done")
