export const runDepthEstimation = async (webcamRef, setDetections, setHeatmapImage) => {
  if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
    console.log("Webcam not ready for depth estimation.");
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
        type: 'depth_estimation',
      }),
    });

    const data = await response.json();
    console.log("🔁 Backend response:", data);

    // ✅ This is where you add it
    if (data.processed_image) {
      setHeatmapImage(`data:image/jpeg;base64,${data.processed_image}`);
    }

    if (data && data.data && typeof data.data.center_depth === 'number') {
      setDetections([{ center_depth: data.data.center_depth }]);
    } else {
      setDetections([{ message: "Unexpected depth format", data }]);
    }
  } catch (error) {
    console.error('Depth estimation failed:', error);
    setDetections([{ error: "Failed to connect to backend or process frame." }]);
  }
};
