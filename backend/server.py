from flask import Flask, request, jsonify, send_file
import cv2
from transformers import AutoProcessor, RTDetrForObjectDetection, VitPoseForPoseEstimation
from PIL import Image
import torch
import numpy as np
import os
from werkzeug.utils import secure_filename
from flask_cors import CORS
import json
import time
from lib.models import get_model
from lib.core.config import parse_args
from lib.data_utils.kp_utils import convert_kps
from lib.utils.renderer import Renderer

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'mp4'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process the video
        results, pose_path = process_video(filepath)

        # Delete video
        os.remove(filepath)
        
        return jsonify({
            'segments': results,  # From process_video
            'pose_data_url': f"/download/{os.path.basename(pose_path)}"
        }), 200
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    
    if os.path.exists(filepath):
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='video/mp4'
        )
    else:
        return jsonify({'error': 'File not found'}), 404

def process_video(video_path):
    # Set up device (use GPU if available)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Load object detection model (RT-DETR) and pose estimation model (ViTPose)
    person_image_processor = AutoProcessor.from_pretrained("PekingU/rtdetr_r50vd_coco_o365")
    person_model = RTDetrForObjectDetection.from_pretrained("PekingU/rtdetr_r50vd_coco_o365", device_map=device)
    pose_image_processor = AutoProcessor.from_pretrained("usyd-community/vitpose-base-simple")
    pose_model = VitPoseForPoseEstimation.from_pretrained("usyd-community/vitpose-base-simple", device_map=device)

    # Open video file
    cap = cv2.VideoCapture(video_path)
    valid_frames = []  # Stores (frame_num, frame_data, pose_data)
    frame_count = 0

    # Prepare output video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # MP4 codec
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # First pass: Detect valid frames and store pose data
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        
        frame_count += 1
        
        # Convert frame to PIL Image format
        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

        # Stage 1: Detect humans in the frame
        inputs = person_image_processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = person_model(**inputs)

        results = person_image_processor.post_process_object_detection(
            outputs, target_sizes=torch.tensor([(image.height, image.width)]), threshold=0.3
        )
        
        # Extract bounding boxes for detected persons
        person_boxes = results[0]["boxes"][results[0]["labels"] == 0].cpu().numpy()

        pose_results = []

        # If there is exactly one detected person, proceed to pose estimation
        if len(person_boxes) == 1:
            # Convert bounding boxes from VOC to COCO format (x1, y1, w, h)
            person_boxes[:, 2] -= person_boxes[:, 0]
            person_boxes[:, 3] -= person_boxes[:, 1]

            # Stage 2: Detect keypoints for the detected person
            inputs = pose_image_processor(image, boxes=[person_boxes], return_tensors="pt").to(device)
            with torch.no_grad():
                outputs = pose_model(**inputs)

            pose_results = pose_image_processor.post_process_pose_estimation(outputs, boxes=[person_boxes])
        
        if len(person_boxes) == 1 and len(pose_results) == 1:
            print("POSE RESULTS", pose_results)
            valid_frames.append({
                "frame_num": frame_count,
                "frame_data": frame.copy(),
                "pose_data": {
                    "keypoints": pose_results[0][0]['keypoints'].cpu().numpy().tolist(),
                    "scores": pose_results[0][0]['scores'].cpu().numpy().tolist()
                }
            })

    # Group continuous frames
    segments = group_continuous_frames([f["frame_num"] for f in valid_frames])
    
    # Process segments
    cap.release()
    cap = cv2.VideoCapture(video_path)

    results = []
    all_pose_data = {}
    
    for seg_idx, segment in enumerate(segments):
        # Get frames for this segment
        seg_frames = [f for f in valid_frames 
                     if f["frame_num"] in segment]
        
        # Create unique filenames
        timestamp = int(time.time())
        base_name = f"segment_{seg_idx}_{timestamp}"
        seg_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{base_name}.mp4")
        overlay_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{base_name}_overlay.mp4")
        
        # Initialize writers
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        seg_writer = cv2.VideoWriter(seg_path, fourcc, fps, (width, height))
        overlay_writer = cv2.VideoWriter(overlay_path, fourcc, fps, (width, height))
        
        # Store pose data
        seg_pose_data = []
        
        for frame_data in seg_frames:
            # Write original frame
            seg_writer.write(frame_data["frame_data"])
            
            # Create overlay
            overlay_frame = draw_pose_overlay(
                frame_data["frame_data"].copy(),
                frame_data["pose_data"]["keypoints"],
                frame_data["pose_data"]["scores"]
            )
            overlay_writer.write(overlay_frame)
            
            # Collect pose data
            seg_pose_data.append({
                "frame": frame_data["frame_num"],
                "keypoints": frame_data["pose_data"]["keypoints"],
                "scores": frame_data["pose_data"]["scores"]
            })
        
        # Release writers
        seg_writer.release()
        overlay_writer.release()
        
        # Store segment info
        results.append({
            "video_url": f"/download/{os.path.basename(seg_path)}",
            "overlay_url": f"/download/{os.path.basename(overlay_path)}",
            "duration": len(seg_frames)/fps,
            "start_frame": segment[0],
            "end_frame": segment[-1]
        })
        
        all_pose_data[f"segment_{seg_idx}"] = seg_pose_data

    # Save pose data
    pose_path = os.path.join(app.config['OUTPUT_FOLDER'], 'pose_data.json')
    with open(pose_path, 'w') as f:
        json.dump(all_pose_data, f)

    cap.release()
    return results, pose_path

def group_continuous_frames(frames):
    if not frames: return []
    frames = sorted(frames)
    segments = []
    current = [frames[0]]
    
    for f in frames[1:]:
        if f == current[-1]+1:
            current.append(f)
        else:
            segments.append(current)
            current = [f]
    segments.append(current)
    return segments

def draw_pose_overlay(frame, keypoints, scores):
    # AlphaPose-style visualization
    # Define skeleton connections (COCO format)
    skeleton = [
        (0, 1), (0, 2), (1, 3), (2, 4),          # Head and shoulders
        (5, 6), (5, 7), (7, 9), (6, 8), (8, 10), # Arms
        (11, 12), (5, 11), (6, 12), (11, 13),    # Body and legs
        (12, 14), (13, 15), (14, 16)             # Feet
    ]
    
    # Convert keypoints to numpy array (shape: [num_keypoints, 3])
    kps = np.array(keypoints)  # Remove [0] index here
    scores = np.array(scores)
    
    # Draw keypoints
    for i, kp in enumerate(kps):
        x, y = kp
        conf = scores[i]
        if conf > 0.3:
            cv2.circle(frame, (int(x), int(y)), 5, (0, 255, 0), -1)
    
    # Draw skeleton connections
    for (i, j) in skeleton:
        if i < len(kps) and j < len(kps):
            x1, y1 = kps[i]
            c1 = scores[i]
            x2, y2 = kps[j]
            c2 = scores[j]
            if c1 > 0.3 and c2 > 0.3:
                cv2.line(frame, 
                        (int(x1), int(y1)), 
                        (int(x2), int(y2)), 
                        (0, 255, 255), 2)
    
    return frame

def create_segment_writers(seg_idx, fps, width, height):
    base_name = f"segment_{seg_idx}_{int(time.time())}"
    seg_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{base_name}.mp4")
    overlay_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{base_name}_overlay.mp4")
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    seg_writer = cv2.VideoWriter(seg_path, fourcc, fps, (width, height))
    overlay_writer = cv2.VideoWriter(overlay_path, fourcc, fps, (width, height))
    
    return seg_path, overlay_path

if __name__ == '__main__':
    app.run(debug=True)
