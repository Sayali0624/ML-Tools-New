// src/models/objectDetection.js

export const runObjectDetection = async (webcamRef, setDetections) => {
  if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
    console.log("Webcam not ready for object detection.");
    return;
  }

  const video = webcamRef.current.video;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageDataURL = canvas.toDataURL('image/jpeg', 0.8);
  const base64Image = imageDataURL.split(',')[1];

  try {
    const response = await fetch('http://localhost:5000/process_frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        type: 'object_detection',
      }),
    });

    const data = await response.json();

    if (data && data.data && data.data.detections) {
      setDetections(data.data.detections);  // Update UI
    } else if (data && data.error) {
      setDetections([{ error: data.error }]);
    } else {
      setDetections([{ message: "No object detections received." }]);
    }

  } catch (error) {
    console.error('Object detection failed:', error);
    setDetections([{ error: "Failed to connect to backend or process frame." }]);
  }
};
