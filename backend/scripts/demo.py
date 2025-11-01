import cv2
import datetime
import time
import os

# --- Video setup ---
# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
video_path = os.path.join(script_dir, "car_demo.mp4")
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"Failed to open video file: {video_path}", flush=True)
    exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
frame_duration = 1.0 / fps  # seconds per frame

# --- Motion detection setup ---
fgbg = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=50, detectShadows=False)
slot_region = (110, 70, 400, 300)
motion_threshold = 5000
stable_frames_to_mark_in = 15

status = "OUT"
motion_counter = 0
stop_counter = 0

# --- Store detected entry/exit times ---
detected_entry_time = None
detected_exit_time = None

# --- Timer for printing every second ---
last_print_time = time.time()

print("Demo script started", flush=True)

frame_index = 0
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame_index += 1
    x, y, w, h = slot_region
    slot_frame = frame[y:y+h, x:x+w]

    fgmask = fgbg.apply(slot_frame)
    fgmask = cv2.GaussianBlur(fgmask, (5,5), 0)
    motion_count = cv2.countNonZero(fgmask)

    # --- Car entering ---
    if status == "OUT":
        if motion_count > motion_threshold:
            motion_counter += 1
            stop_counter = 0
        else:
            if motion_counter > 0:
                stop_counter += 1
            if stop_counter >= stable_frames_to_mark_in:
                status = "IN"
                motion_counter = 0
                stop_counter = 0
                detected_entry_time = datetime.datetime.now()
                print(f"{detected_entry_time.strftime('%Y-%m-%d %H:%M:%S')} -> Car Entered -> Status IN", flush=True)
                print(f"LOG ENTRY TIME: {detected_entry_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)  # extra log

    # --- Car leaving ---
    elif status == "IN":
        if motion_count > motion_threshold:
            status = "OUT"
            motion_counter = 0
            stop_counter = 0
            detected_exit_time = datetime.datetime.now()
            print(f"{detected_exit_time.strftime('%Y-%m-%d %H:%M:%S')} -> Car Left -> Status OUT", flush=True)
            print(f"LOG EXIT TIME: {detected_exit_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)  # extra log

    # --- Print slot status every second ---
    now = time.time()
    if now - last_print_time >= 1.0:
        print(f"Current Time: {datetime.datetime.now().strftime('%H:%M:%S')} | Slot Status: {status}", flush=True)
        last_print_time = now

    # --- Sleep to maintain real-time playback ---
    time.sleep(frame_duration)

cap.release()
print("Demo finished", flush=True)

# --- Print detected entry/exit times at the end ---
if detected_entry_time:
    print(f"Detected Entry Time: {detected_entry_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
else:
    print("Detected Entry Time: Not detected", flush=True)

if detected_exit_time:
    print(f"Detected Exit Time: {detected_exit_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
else:
    print("Detected Exit Time: Not detected", flush=True)
