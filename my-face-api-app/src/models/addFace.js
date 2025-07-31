// src/models/addFace.js
import * as faceapi from 'face-api.js';

/**
 * Captures a face from the webcam, detects its descriptor, adds it to the FaceMatcher,
 * and triggers a download of the captured face image.
 * @param {React.RefObject} webcamRef - Ref to the WebcamFeed component.
 * @param {string} personName - The name of the person to add.
 * @param {faceapi.FaceMatcher} currentFaceMatcher - The current FaceMatcher instance from App.js state.
 * @returns {Promise<faceapi.FaceMatcher>} A promise that resolves with the updated FaceMatcher instance.
 */
export const addNewFace = async (webcamRef, personName, currentFaceMatcher) => {
  if (!webcamRef.current || !webcamRef.current.video) {
    throw new Error("Webcam not ready. Cannot capture face.");
  }

  const video = webcamRef.current.video;

  // Create a temporary canvas to capture the current video frame
  const canvas = faceapi.createCanvasFromMedia(video);
  const context = canvas.getContext('2d');
  if (context) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  try {
    // Detect a single face and get its descriptor from the captured frame
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error("No face detected in the captured image. Please ensure your face is clearly visible.");
    }

    // --- Image Download Logic ---
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Get image data as JPEG
    const fileName = `${personName}-1.jpg`; // Desired filename

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName; // Set the download filename
    document.body.appendChild(link); // Append to body to make it clickable
    link.click(); // Programmatically click the link to trigger download
    document.body.removeChild(link); // Clean up the link element

    // --- FaceMatcher Update Logic ---
    // Create a new LabeledFaceDescriptors for the new person
    const newLabeledDescriptor = new faceapi.LabeledFaceDescriptors(personName, [detection.descriptor]);

    const existingLabeledDescriptors = currentFaceMatcher ? currentFaceMatcher.labeledDescriptors : [];
    const allLabeledDescriptors = [...existingLabeledDescriptors, newLabeledDescriptor];

    const updatedFaceMatcher = new faceapi.FaceMatcher(allLabeledDescriptors, 0.6);

    return updatedFaceMatcher;

  } catch (error) {
    console.error("Error adding new face:", error);
    throw new Error(`Failed to process face: ${error.message}`);
  } finally {
    // Clean up the temporary canvas from the DOM
    canvas.remove();
  }
};
