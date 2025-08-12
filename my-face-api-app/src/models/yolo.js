// Add labels
/* global cv */
import * as ort from 'onnxruntime-web';

const labels = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
];

let session = null;

export async function loadModel() {
  if (!session) {
    const yolov8 = await ort.InferenceSession.create("/models/yolov8n.onnx");
    const nms = await ort.InferenceSession.create("/models/nms-yolov8.onnx");
    session = { net: yolov8, nms };
  }
  return session;
}

function letterbox(video, targetSize = 640) {
  const imgW = video.videoWidth;
  const imgH = video.videoHeight;

  // scale to fit in target size while keeping aspect ratio
  const scale = Math.min(targetSize / imgW, targetSize / imgH);
  const newW = Math.round(imgW * scale);
  const newH = Math.round(imgH * scale);

  // padding to make square
  const padW = targetSize - newW;
  const padH = targetSize - newH;
  const padLeft = Math.floor(padW / 2);
  const padTop = Math.floor(padH / 2);

  // draw to temp canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, targetSize, targetSize);
  ctx.drawImage(video, padLeft, padTop, newW, newH);

  // convert to OpenCV mat
  const mat = cv.imread(canvas);
  const matC3 = new cv.Mat();
  cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR);
  mat.delete();

  // create blob
  const blob = cv.blobFromImage(
    matC3,
    1 / 255.0,
    new cv.Size(targetSize, targetSize),
    new cv.Scalar(0, 0, 0),
    true,
    false
  );
  matC3.delete();

  return { blob, scale, padLeft, padTop };
}

export async function runYOLO(video) {
  const inputSize = 640;
  const sess = await loadModel();

  const { blob, scale, padLeft, padTop } = letterbox(video, inputSize);

  const tensor = new ort.Tensor("float32", blob.data32F, [1, 3, inputSize, inputSize]);
  blob.delete();

  const config = new ort.Tensor("float32", new Float32Array([100, 0.45, 0.2]));

  const { output0 } = await sess.net.run({ images: tensor });
  const { selected } = await sess.nms.run({ detection: output0, config });

  const detections = [];
  for (let idx = 0; idx < selected.dims[1]; idx++) {
    const data = selected.data.slice(idx * selected.dims[2], (idx + 1) * selected.dims[2]);
    const [cx, cy, w, h] = data.slice(0, 4);
    const scores = data.slice(4);
    const score = Math.max(...scores);
    const labelIndex = scores.indexOf(score);

    // reverse the letterbox scaling and padding
    const x = (cx - w / 2 - padLeft) / scale;
    const y = (cy - h / 2 - padTop) / scale;
    const width = w / scale;
    const height = h / scale;

    detections.push({
      class: labels[labelIndex],
      score,
      box: { x, y, width, height }
    });
  }

  return detections;
}