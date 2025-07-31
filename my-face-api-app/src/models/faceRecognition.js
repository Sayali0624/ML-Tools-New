// src/models/faceRecognition.js
import * as faceapi from 'face-api.js';

/**
 * Runs face detection and recognition on the webcam feed.
 * @param {React.RefObject} webcamRef - Ref to the WebcamFeed component.
 * @param {function} setDetections - Callback to update detections in App.js state.
 * @param {faceapi.FaceMatcher} faceMatcher - The FaceMatcher instance for recognition.
 * @returns {Array} - Returns the array of detected and recognized faces.
 */
export const runFaceRecognition = async (webcamRef, setDetections, faceMatcher) => {
  if (!webcamRef.current || !webcamRef.current.video || !faceMatcher) {
    console.warn("Webcam or FaceMatcher not ready for face recognition.");
    return []; // Return an empty array if not ready
  }

  const video = webcamRef.current.video;
  const displaySize = { width: video.videoWidth, height: video.videoHeight };

  try {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Perform face matching
    // Corrected typo: 'resizedDizedDetections' to 'resizedDetections'
    const results = resizedDetections.map(d => {
      const bestMatch = faceMatcher.findBestMatch(d.descriptor);
      return {
        detection: d.detection,
        descriptor: d.descriptor,
        name: bestMatch.label, // The recognized label (e.g., 'Sayali', 'Unknown')
        distance: bestMatch.distance // The similarity distance
      };
    });

    setDetections(results); // Update the state in App.js
    return results; // Return the results for App.js to use
  } catch (error) {
    console.error("Error during face recognition:", error);
    setDetections([]); // Clear detections on error
    return []; // Return empty array on error
  }
};
