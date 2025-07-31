// src/models/emotionDetection.js
import * as faceapi from 'face-api.js';

/**
 * Runs emotion detection on the webcam feed.
 * @param {React.RefObject} webcamRef - Ref to the WebcamFeed component.
 * @param {function} setDetections - Callback to update detections in App.js state.
 */
export const runEmotionDetection = async (webcamRef, setDetections) => {
  if (!webcamRef.current || !webcamRef.current.video) {
    console.warn("Webcam not ready for emotion detection.");
    return;
  }

  const video = webcamRef.current.video;
  const displaySize = { width: video.videoWidth, height: video.videoHeight };

  try {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Format detections for state: { detection, expressions, dominantEmotion }
    const formattedDetections = resizedDetections.map(d => {
      const expressions = d.expressions;
      let dominantEmotion = 'neutral';
      if (expressions) {
        const maxValue = Math.max(...Object.values(expressions));
        dominantEmotion = Object.keys(expressions).find(
          key => expressions[key] === maxValue
        ) || 'neutral';
      }

      return {
        detection: d.detection,
        expressions: expressions,
        emotion: dominantEmotion // Store the dominant emotion
      };
    });

    setDetections(formattedDetections);
  } catch (error) {
    console.error("Error during emotion detection:", error);
    setDetections([]); // Clear detections on error
  }
};
