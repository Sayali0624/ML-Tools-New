# ml-backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import torch
import numpy as np
from ultralytics import YOLO
from tensorflow.keras.models import load_model
import face_recognition
import os
import sys # For error logging
import traceback # For detailed error logging
from PIL import Image # For age estimation image processing
import torchvision.transforms as transforms # For age estimation transforms
import torchvision.models as models # For age estimation model definition
import torch.nn as nn # For age estimation model definition
import base64 # For encoding image data for depth heatmap

# Initialize Flask app
app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing frontend to access it

# --- Configuration for Age Estimation Model ---
AGE_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'age_model_efficientnetb0.pth')
HAARCASCADE_PATH_AGE = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml' # For age estimation face detection

# --- Define the Age Regression Model (EfficientNetB0) ---
class AgeRegressionModel(nn.Module):
    def __init__(self, num_classes=1): # num_classes=1 for regression
        super(AgeRegressionModel, self).__init__()
        # Use 'weights' parameter instead of 'pretrained' to avoid UserWarning
        # models.EfficientNet_B0_Weights.IMAGENET1K_V1 provides the standard ImageNet weights
        self.base_model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        # Modify the classifier for regression
        num_ftrs = self.base_model.classifier[1].in_features
        self.base_model.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_ftrs, num_classes)
        )

    def forward(self, x):
        return self.base_model(x)

# --- Global Model and Configuration Loading ---
# This ensures models are loaded into memory only once when the Flask app starts.
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Global variables for models and data
yolo_model = None
midas = None
midas_transforms = None
emotion_model = None
age_model = None # New global for age model
face_cascade_emotion = None # Used for emotion detection
face_cascade_age = None # Used for age estimation
known_face_encodings = []
known_face_names = []
known_faces_dir = 'known_faces'

# Camera parameters for 3D coordinates in Object Detection (adjust if webcam resolution changes)
FOCAL_LENGTH = 500
CX, CY = 320, 240 # Principal point for 640x480 resolution

try:
    print(f"Loading models on device: {device}", file=sys.stderr)

    # Ensure the known_faces directory exists for face recognition
    if not os.path.exists(known_faces_dir):
        os.makedirs(known_faces_dir)
        print(f"Created directory: {known_faces_dir}", file=sys.stderr)

    # Load YOLO Object Detector
    yolo_model = YOLO("yolov8n.pt") # Small, fast model
    print("YOLOv8 model loaded successfully.", file=sys.stderr)

    # Load MiDaS Depth Estimator
    midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
    midas.to(device).eval()
    midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms").small_transform
    print("MiDaS model loaded successfully.", file=sys.stderr)

    # Load Emotion Detection model
    emotion_model = load_model("emotion_model.h5")
    print("Emotion detection model loaded successfully.", file=sys.stderr)

    # Load Age Estimation model
    age_model = AgeRegressionModel()
    # --- START FIX FOR MISSING/UNEXPECTED KEYS IN STATE DICT ---
    state_dict = torch.load(AGE_MODEL_PATH, map_location=device)
    
    # Create a new state_dict by remapping keys
    remapped_state_dict = {}
    for k, v in state_dict.items():
        if k.startswith('model.features.'):
            # Example: 'model.features.0.0.weight' -> 'base_model.features.0.0.weight'
            new_key = 'base_model.' + k[len('model.'):]
            remapped_state_dict[new_key] = v
        elif k.startswith('model.classifier.'):
            # Example: 'model.classifier.1.weight' -> 'base_model.classifier.1.weight'
            new_key = 'base_model.' + k[len('model.'):]
            remapped_state_dict[new_key] = v
        else:
            # For any other keys that don't match the specific 'model.' prefixes,
            # keep them as is. This handles cases where the state_dict might have
            # other top-level keys or already correctly prefixed keys.
            remapped_state_dict[k] = v
    
    age_model.load_state_dict(remapped_state_dict)
    # --- END FIX FOR MISSING/UNEXPECTED KEYS IN STATE DICT ---
    age_model.to(device).eval()
    print("Age estimation model loaded successfully.", file=sys.stderr)

    # Load Haar Cascade for Face Detection (used by emotion detection and age estimation)
    face_cascade_emotion = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    face_cascade_age = cv2.CascadeClassifier(HAARCASCADE_PATH_AGE) # Use a separate instance or the same
    if face_cascade_emotion.empty() or face_cascade_age.empty():
        raise Exception(f"Could not load Haar cascade classifier from {cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'}. Please check the path and file integrity.")
    print("Haar cascade classifiers loaded successfully.", file=sys.stderr)

    # Load Known Faces for Face Recognition
    print("Loading known faces for recognition...", file=sys.stderr)
    for filename in os.listdir(known_faces_dir):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            path = os.path.join(known_faces_dir, filename)
            try:
                image = face_recognition.load_image_file(path)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    known_face_encodings.append(encodings[0])
                    known_face_names.append(os.path.splitext(filename)[0])
                    print(f"Loaded face: {os.path.splitext(filename)[0]}", file=sys.stderr)
                else:
                    print(f"No face found in {filename}", file=sys.stderr)
            except Exception as e:
                print(f"Error processing image {filename} for face recognition: {e}", file=sys.stderr)
    print(f"Finished loading {len(known_face_names)} known faces.", file=sys.stderr)

except Exception as e:
    print(f"Error during initial model loading: {e}\n{traceback.format_exc()}", file=sys.stderr)
    sys.exit(1) # Exit if critical models fail to load

# Emotion detection labels and image size
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
IMG_SIZE = 48 # Image size for emotion model input

# Age estimation transforms
age_transform = transforms.Compose([
    transforms.Resize((224, 224)), # EfficientNet expects 224x224
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# ---------------- Object Detection + Depth Estimation ---------------- #
@app.route('/detect', methods=['POST'])
def detect_objects_and_depth_internal(frame):
    h, w, _ = frame.shape
    results = yolo_model(frame, verbose=False)[0]
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    input_batch = midas_transforms(img_rgb).to(device)

    with torch.no_grad():
        depth_map = midas(input_batch).squeeze().cpu().numpy()
        depth_resized = cv2.resize(depth_map, (w, h))

    detected_objects = []

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        conf = float(box.conf[0])
        cls_id = int(box.cls[0])
        label = yolo_model.names[cls_id]
        u = int((x1 + x2) / 2)
        v = int((y1 + y2) / 2)

        if not (0 <= v < depth_resized.shape[0] and 0 <= u < depth_resized.shape[1]):
            continue

        Z = float(depth_resized[v, u] / 10.0)
        if Z <= 0:
            continue
        X = float((u - CX) * Z / FOCAL_LENGTH)
        Y = float((v - CY) * Z / FOCAL_LENGTH)

        detected_objects.append({
            'label': str(label),
            'confidence': conf,
            'bbox': [x1, y1, x2, y2],
            'coordinates_3d': [round(X, 2), round(Y, 2), round(Z, 2)]
        })

    return jsonify({'data': {'detections': detected_objects}})

def depth_estimation_internal(frame):
    h, w = frame.shape[:2]
    input_tensor = midas_transforms(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).to(device)

    with torch.no_grad():
        prediction = midas(input_tensor)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1), size=(h, w), mode="bicubic", align_corners=False
        ).squeeze()

    depth_map = prediction.cpu().numpy()
    center_depth = float(depth_map[h // 2, w // 2])

    if not hasattr(depth_estimation_internal, "ref"):
        depth_estimation_internal.ref = []
    ref = depth_estimation_internal.ref
    ref.append(center_depth)
    if len(ref) > 30:
        ref.pop(0)
    mean_ref = np.mean(ref)

    stable_depth = (depth_map / mean_ref) * 70
    stable_depth = np.clip(stable_depth, 10, 150)
    vis = 255 * (stable_depth - 10) / (150 - 10)
    colormap = cv2.applyColorMap(vis.astype(np.uint8), cv2.COLORMAP_MAGMA)

    _, buffer = cv2.imencode('.jpg', colormap)
    heatmap_b64 = base64.b64encode(buffer).decode('utf-8')

    return jsonify({
        "processed_image": heatmap_b64,
        "data": {"center_depth": round(center_depth, 1)}
    })

def activity_detection_internal(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    intensity = float(np.mean(gray))
    activity = "Running" if intensity > 100 else "Idle"
    return jsonify({"data": {
        "activities": [{
            "predicted_activity": activity,
            "mean_pixel_intensity": intensity
        }]
    }})

# ---------------- Emotion Detection ---------------- #
@app.route('/predict_emotion', methods=['POST'])
def predict_emotion():
    try:
        if emotion_model is None or face_cascade_emotion is None:
            return jsonify({"error": "Emotion detection model or face cascade not loaded."}), 500

        # Get image data from JSON body
        image_data_b64 = request.json['image']
        npimg = np.frombuffer(base64.b64decode(image_data_b64), np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Could not decode image."}), 400

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade_emotion.detectMultiScale(gray, 1.3, 5)

        emotions_result = []

        for (x, y, w, h) in faces:
            roi = gray[y:y+h, x:x+w]
            roi_resized = cv2.resize(roi, (IMG_SIZE, IMG_SIZE))
            roi_normalized = roi_resized / 255.0
            roi_input = roi_normalized.reshape(1, IMG_SIZE, IMG_SIZE, 1)

            predictions = emotion_model.predict(roi_input, verbose=0) # verbose=0 to suppress output
            pred_index = np.argmax(predictions)
            label = emotion_labels[pred_index]
            confidence = float(predictions[0][pred_index])

            emotions_result.append({
                'emotion': label,
                'confidence': round(confidence, 2),
                'bbox': [int(x), int(y), int(x + w), int(y + h)]
            })

        return jsonify({'emotions': emotions_result})

    except Exception as e:
        print(f"Error in /predict_emotion: {e}\n{traceback.format_exc()}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

# ---------------- Face Recognition ---------------- #
@app.route('/predict_face', methods=['POST'])
def predict_face():
    try:
        if not known_face_encodings:
            print("Warning: No known faces loaded for recognition.", file=sys.stderr)
            # Continue to process, but all faces will be "Unknown"
            # return jsonify({"error": "No known faces loaded for recognition."}), 500

        # Get image data from JSON body
        image_data_b64 = request.json['image']
        npimg = np.frombuffer(base64.b64decode(image_data_b64), np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Could not decode image."}), 400

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Find all face locations and face encodings in the current frame
        face_locations = face_recognition.face_locations(rgb_frame, model='hog')
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        faces_result = []

        for encoding, (top, right, bottom, left) in zip(face_encodings, face_locations):
            name = "Unknown"
            if known_face_encodings: # Only compare if there are known faces
                # Compare current face encoding with known face encodings
                distances = face_recognition.face_distance(known_face_encodings, encoding)
                best_match_index = np.argmin(distances)
                # A lower distance means a better match. 0.45 is a common threshold.
                if distances[best_match_index] < 0.45:
                    name = known_face_names[best_match_index]

            faces_result.append({
                'name': name,
                'bbox': [int(left), int(top), int(right), int(bottom)]
            })

        return jsonify({'faces': faces_result})

    except Exception as e:
        print(f"Error in /predict_face: {e}\n{traceback.format_exc()}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

# ---------------- Add Face Route ---------------- #
@app.route('/add_face', methods=['POST'])
def add_face():
    try:
        name = request.form.get('name')
        file = request.files.get('image') # This route correctly expects a file upload

        if not name or not file:
            return jsonify({'message': 'Missing name or image'}), 400

        # Sanitize name to be a valid filename
        safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '.', '_')).rstrip()
        if not safe_name:
            return jsonify({'message': 'Invalid name provided.'}), 400

        save_path = os.path.join(known_faces_dir, f"{safe_name}.jpg")

        # Save the image
        file.save(save_path)

        # Optionally, reload the known faces immediately without requiring a restart
        # For simplicity and to match the original request, we suggest a restart.
        # In a production app, you might want to dynamically update known_face_encodings.
        # Example for dynamic update (uncomment if needed):
        # image = face_recognition.load_image_file(save_path)
        # encodings = face_recognition.face_encodings(image)
        # if encodings:
        #     known_face_encodings.append(encodings[0])
        #     known_face_names.append(safe_name)
        #     return jsonify({'message': f'Face for {safe_name} added successfully!'})
        # else:
        #     os.remove(save_path) # Remove if no face was found
        #     return jsonify({'message': f'No face found in the provided image for {safe_name}.'}), 400


        return jsonify({'message': f'Face saved as {safe_name}.jpg. Please restart backend to load new face.'})

    except Exception as e:
        print(f"Error in /add_face: {e}\n{traceback.format_exc()}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

# ---------------- Age Estimation ---------------- #
@app.route('/predict_age', methods=['POST'])
def predict_age():
    try:
        if age_model is None or face_cascade_age is None:
            return jsonify({"error": "Age estimation model or face cascade not loaded."}), 500

        # Get image data from JSON body
        image_data_b64 = request.json['image']
        npimg = np.frombuffer(base64.b64decode(image_data_b64), np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Could not decode image."}), 400

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade_age.detectMultiScale(gray, 1.3, 5)

        age_predictions_result = []

        for (x, y, w, h) in faces:
            # Extract face ROI
            face_roi_color = frame[y:y+h, x:x+w]
            
            # Convert to PIL Image and apply transforms
            pil_image = Image.fromarray(cv2.cvtColor(face_roi_color, cv2.COLOR_BGR2RGB))
            input_tensor = age_transform(pil_image).unsqueeze(0).to(device) # Add batch dimension

            with torch.no_grad():
                output = age_model(input_tensor)
                predicted_age = round(output.item()) # Get the scalar value and round it

            age_predictions_result.append({
                'age': predicted_age,
                'bbox': [int(x), int(y), int(x + w), int(y + h)]
            })
        print("🧠 Age Estimation Output:", age_predictions_result, file=sys.stderr)

        return jsonify({'age_predictions': age_predictions_result})

    except Exception as e:
        print(f"Error in /predict_age: {e}\n{traceback.format_exc()}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

@app.route('/process_frame', methods=['POST'])
def process_frame():
    try:
        data = request.get_json()
        image_data_b64 = data.get('image')
        processing_type = data.get('type')

        if not image_data_b64 or not processing_type:
            return jsonify({"error": "Missing image or processing type"}), 400

        npimg = np.frombuffer(base64.b64decode(image_data_b64), np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        if frame is None:
            return jsonify({"error": "Invalid image"}), 400

        # Handle dispatch by type
        if processing_type == 'object_detection':
            return detect_objects_and_depth_internal(frame)
        elif processing_type == 'depth_estimation':
            return depth_estimation_internal(frame)
        elif processing_type == 'activity_detection':
            return activity_detection_internal(frame)
        else:
            return jsonify({"error": f"Unknown processing type: {processing_type}"}), 400

    except Exception as e:
        print(f"Error in /process_frame: {e}\n{traceback.format_exc()}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500


# ---------------- Run Server ---------------- #
if __name__ == '__main__':
    # Run Flask app
    # host='0.0.0.0' makes it accessible from other devices on the network (if needed)
    # port=5000 is the default Flask port
    # debug=True is good for development (reloads on code changes, provides debug info)
    # but set to False for production for security and performance.
    app.run(host='0.0.0.0', port=5000, debug=True)
