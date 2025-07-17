export const runEmotionDetection = async (webcamRef, setDetections) => {
  if (
    !webcamRef.current ||
    !webcamRef.current.video ||
    webcamRef.current.video.readyState !== 4
  ) return;

  const video = webcamRef.current.video;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const base64Image = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

  try {
    const response = await fetch("http://localhost:5000/predict_emotion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: base64Image })
    });

    const data = await response.json();
    console.log("🎭 Emotion response:", data);

    if (data && data.emotions) {
      setDetections(data.emotions);
    } else {
      setDetections([]);
    }
  } catch (err) {
    console.error("Emotion detection failed:", err);
    setDetections([]);
  }
};
