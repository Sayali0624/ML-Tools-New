// src/models/ageEstimation.js

export const runAgeEstimation = async (webcamRef, setDetections) => {
  if (
    !webcamRef.current ||
    !webcamRef.current.video ||
    webcamRef.current.video.readyState !== 4
  ) {
    console.log("Webcam not ready for age estimation.");
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
    const response = await fetch('http://localhost:5000/predict_age', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log("📩 Age API response:", data);

    if (data && data.age_predictions) {
      // Map 'bbox' to 'box' so WebcamFeed can draw it
      const formattedDetections = data.age_predictions.map(det => ({
        ...det,
        box: det.bbox
      }));
      setDetections(formattedDetections);
    } else if (data && data.error) {
      setDetections([{ error: data.error }]);
      console.error("Backend error for age estimation:", data.error);
    } else {
      setDetections([{ message: "No age predictions received or unexpected response format." }]);
      console.warn("Unexpected response from backend for age estimation:", data);
    }
  } catch (error) {
    console.error('Age estimation failed:', error);
    setDetections([{ error: "Failed to connect to backend or process frame for age estimation." }]);
  }
};
