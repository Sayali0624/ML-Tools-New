import { runYOLO } from "./yolo";

export async function runObjectDetection(webcamRef, setDetections) {
  const video = webcamRef.current?.video;
  if (!video || video.readyState !== 4) return;

  const detections = await runYOLO(video);
  setDetections(detections);
}
