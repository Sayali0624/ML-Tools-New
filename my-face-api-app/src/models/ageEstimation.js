// src/models/ageEstimation.js
import * as faceapi from 'face-api.js';

/**
 * Runs age and gender estimation on the webcam feed.
 * @param {React.RefObject} webcamRef - Ref to the WebcamFeed component.
 * @param {function} setDetections - Callback to update detections in App.js state.
 */
export const runAgeEstimation = async (webcamRef, setDetections) => {
  if (!webcamRef.current || !webcamRef.current.video) {
    console.warn("Webcam not ready for age estimation.");
    return;
  }

  const video = webcamRef.current.video;
  const displaySize = { width: video.videoWidth, height: video.videoHeight };

  try {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Format detections for state: { detection, age, gender }
    const formattedDetections = resizedDetections.map(d => ({
      detection: d.detection,
      age: d.age,
      gender: d.gender
    }));

    setDetections(formattedDetections);
  } catch (error) {
    console.error("Error during age estimation:", error);
    setDetections([]); // Clear detections on error
  }
};
