# ml-backend/process_image.py

import cv2
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import torchvision.models as models
import numpy as np
import sys
import json
import base64

# --- Configuration ---
# Path to your age model .pth file
# Make sure 'age_model_efficientnetb0.pth' is in the same directory as this script,
# or provide the full absolute path.
AGE_MODEL_PATH = 'age_model_efficientnetb0.pth'

# --- Define the Age Regression Model (EfficientNetB0) ---
# This class definition must match the architecture used when the model was trained.
# Assuming EfficientNetB0 as per your filename.
class AgeRegressionModel(nn.Module):
    def __init__(self):
        super(AgeRegressionModel, self).__init__()
        # Load pre-trained EfficientNetB0 and modify the classifier for regression
        self.model = models.efficientnet_b0(pretrained=False) # Set to False as we load custom weights
        # The last layer of EfficientNetB0 is 'classifier[1]' (Linear layer)
        num_ftrs = self.model.classifier[1].in_features
        self.model.classifier[1] = nn.Linear(num_ftrs, 1) # Output a single age value

    def forward(self, x):
        return self.model(x).squeeze(1) # Squeeze to remove extra dimension if batch size is 1

# --- Device Setup ---
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# --- Load Age Model ---
try:
    age_model = AgeRegressionModel().to(device)
    # Load the state_dict from your .pth file
    # map_location ensures it loads correctly regardless of original training device
    age_model.load_state_dict(torch.load(AGE_MODEL_PATH, map_location=device))
    age_model.eval() # Set model to evaluation mode
    print(f"Age model loaded successfully from {AGE_MODEL_PATH} on {device}.")
except Exception as e:
    print(f"Error loading age model: {e}", file=sys.stderr)
    sys.exit(1) # Exit if model cannot be loaded

# --- Define Preprocessing for Age Model ---
# This transform must match the one used during training the age model.
preprocess_age = transforms.Compose([
    transforms.Resize((224, 224)), # EfficientNetB0 typically expects 224x224 input
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]) # ImageNet normalization
])

# --- Load Haar Cascade for Face Detection (for Age Estimation) ---
# Ensure 'haarcascade_frontalface_default.xml' is accessible.
# It's usually part of OpenCV installation, or you can place it in ml-backend directory.
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
if face_cascade.empty():
    print("Error: Could not load Haar cascade classifier. Make sure 'haarcascade_frontalface_default.xml' is accessible.", file=sys.stderr)
    sys.exit(1)


# --- YOLOv8 Object Detector (for Object Detection option) ---
# Only import if needed to avoid unnecessary dependencies for age estimation if not selected.
# This part remains from your previous setup.
try:
    from ultralytics import YOLO
    yolo_model = YOLO("yolov8n.pt") # Small, fast model
    print("YOLOv8 model loaded successfully.")
except ImportError:
    yolo_model = None
    print("Ultralytics YOLO not found. Object detection functionality will be disabled.", file=sys.stderr)
except Exception as e:
    yolo_model = None
    print(f"Error loading YOLOv8 model: {e}", file=sys.stderr)


# --- Function to process image for Object Detection ---
def process_for_object_detection(frame):
    if yolo_model is None:
        return {"error": "YOLOv8 model not loaded. Object detection is unavailable."}

    results = yolo_model(frame)[0]
    detections = []
    for r in results.boxes.data.tolist():
        x1, y1, x2, y2, score, class_id = r
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        class_name = yolo_model.names[int(class_id)]
        detections.append({
            "box": [x1, y1, x2, y2],
            "label": class_name,
            "score": round(score, 2)
        })
        # Draw bounding box and label on the frame
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{class_name} {score:.2f}", (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return {"detections": detections}

# --- Function to process image for Age Estimation ---
def process_for_age_estimation(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    age_predictions = []
    for (x, y, w, h) in faces:
        face_img = frame[y:y+h, x:x+w]
        if face_img.size == 0: # Skip empty face images
            continue

        try:
            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            input_tensor = preprocess_age(face_pil).unsqueeze(0).to(device)

            with torch.no_grad():
                predicted_age = age_model(input_tensor).cpu().item()
                predicted_age = round(predicted_age, 1) # Rounded to 1 decimal

            age_predictions.append({
                "box": [x, y, x + w, y + h],
                "age": predicted_age
            })

            # Draw bounding box and age on the frame
            cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 2)
            cv2.putText(frame, f"Age: {predicted_age}", (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
        except Exception as e:
            print(f"Error processing face for age estimation: {e}", file=sys.stderr)
            # Continue to next face or return partial results

    return {"age_predictions": age_predictions}


# --- Main execution logic ---
if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data_raw = sys.stdin.read()
        input_data = json.loads(input_data_raw)
        
        image_data_b64 = input_data.get('image')
        processing_type = input_data.get('type') # 'object_detection' or 'age_estimation'

        if not image_data_b64:
            raise ValueError("No image data provided in input.")
        if not processing_type:
            raise ValueError("No processing type specified in input.")

        # Decode base64 image
        image_bytes = base64.b64decode(image_data_b64)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Could not decode image. Check base64 data integrity.")

        result_data = {}
        if processing_type == 'object_detection':
            result_data = process_for_object_detection(frame)
        elif processing_type == 'age_estimation':
            result_data = process_for_age_estimation(frame)
        else:
            raise ValueError(f"Unknown processing type: {processing_type}")

        # Encode the processed frame back to base64
        _, buffer = cv2.imencode('.jpg', frame)
        processed_image_b64 = base64.b64encode(buffer).decode('utf-8')

        # Combine results and processed image
        final_output = {
            "processed_image": processed_image_b64,
            "data": result_data # This will contain either "detections" or "age_predictions"
        }

        # Print JSON output to stdout
        print(json.dumps(final_output))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

