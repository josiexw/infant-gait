from flask import Flask, request, jsonify
import cv2
from transformers import AutoProcessor, RTDetrForObjectDetection, VitPoseForPoseEstimation
from PIL import Image
import torch
import numpy as np
import os
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
        frames_with_one_person = process_video(filepath)

        # Delete video
        os.remove(filepath)
        
        return jsonify({'frames_with_one_person': frames_with_one_person}), 200
    
    return jsonify({'error': 'Invalid file type'}), 400

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
    frames_with_one_person = []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

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

            # If a valid pose is detected for the single person, add the frame number
            if len(pose_results) == 1:
                frames_with_one_person.append(frame_count)

    cap.release()
    return frames_with_one_person

if __name__ == '__main__':
    app.run(debug=True)
