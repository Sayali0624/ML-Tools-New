import React, { useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

const WebcamFeed = React.forwardRef(({ detections }, ref) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Ensure canvas dimensions match the video feed for accurate drawing
    if (ref.current && ref.current.video) {
      canvas.width = ref.current.video.videoWidth;
      canvas.height = ref.current.video.videoHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(det => {
      // ➤ Object Detection (3D coordinates)
      if (det.label && det.bbox && det.coordinates_3d) {
        const [x1, y1, x2, y2] = det.bbox;
        const [X, Y, Z] = det.coordinates_3d;
        const label = det.label;
        const confidence = (det.confidence * 100).toFixed(1);

        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = 'lime';
        // Further increased font size for better readability
        ctx.font = '36px Arial'; 
        ctx.fillText(`${label} (${confidence}%)`, x1, y1 > 30 ? y1 - 15 : y1 + 35); // Adjusted Y position
        ctx.fillText(`X:${X.toFixed(2)} Y:${Y.toFixed(2)} Z:${Z.toFixed(2)}`, x1, y2 + 35); // Adjusted Y position
      }

      // ➤ Age Estimation
      if (det.age && det.bbox) {
        const [x1, y1, x2, y2] = det.bbox;

        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = 'blue';
        // Further increased font size for better readability
        ctx.font = '24px Arial'; 
        ctx.fillText(`Age: ${det.age}`, x1, y1 > 30 ? y1 - 15 : y1 + 35); // Adjusted Y position
      }

      // ➤ Activity Detection (show overlay top-center)
      if (det.predicted_activity) {
        ctx.fillStyle = 'orange';
        // Further increased font size for better readability
        ctx.font = 'bold 36px Arial'; 
        ctx.fillText(`Activity: ${det.predicted_activity}`, 20, 60); // Adjusted Y position

        // Further increased font size for better readability
        ctx.font = '28px Arial'; 
        ctx.fillText(`Mean Intensity: ${det.mean_pixel_intensity.toFixed(1)}`, 20, 105); // Adjusted Y position
      }

      // ➤ Emotion Detection
      if (det.emotion && det.bbox) {
        const [x, y, x2, y2] = det.bbox;
        const label = det.emotion;
        const confidence = (det.confidence * 100).toFixed(0);

        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, x2 - x, y2 - y);

        ctx.fillStyle = 'yellow';
        // Further increased font size for better readability
        ctx.font = '36px Arial'; 
        ctx.fillText(`${label} (${confidence}%)`, x, y > 30 ? y - 15 : y + 35); // Adjusted Y position
      }

      // ➤ Face Recognition
      if (det.name && det.bbox) {
        const [x, y, x2, y2] = det.bbox;
        const label = det.name;

        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, x2 - x, y2 - y);

        ctx.fillStyle = 'cyan';
        // Further increased font size for better readability
        ctx.font = '28px Arial'; 
        ctx.fillText(`${label}`, x, y > 30 ? y - 15 : y + 35); // Adjusted Y position
      }

      // ✅ ➤ Depth Estimation (center depth)
      if (det.center_depth !== undefined) {
        ctx.fillStyle = 'orange';
        // Further increased font size for better readability
        ctx.font = 'bold 36px Arial'; 
        ctx.fillText(`Depth: ${det.center_depth.toFixed(1)} cm`, 20, 60); // Adjusted Y position
      }
    });
  }, [detections, ref]); // Added ref to dependency array to re-run when ref updates

  return (
    <>
      <Webcam
        ref={ref}
        audio={false}
        screenshotFormat="image/jpeg"
        className="webcam-feed" // This class will be styled in App.css
        style={{ objectFit: 'cover' }} // Explicitly apply object-fit here
        videoConstraints={{
          width: 1280,
          height: 720,
          facingMode: 'user'
        }}
      />
      <canvas
        ref={canvasRef}
        className="webcam-canvas" // This class will be styled in App.css
        // Canvas dimensions will be set dynamically in useEffect to match video
      />
    </>
  );
});

export default WebcamFeed;
