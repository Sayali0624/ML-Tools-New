import React, { useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

const WebcamFeed = React.forwardRef(({ detections }, ref) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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
        ctx.font = '14px Arial';
        ctx.fillText(`${label} (${confidence}%)`, x1, y1 > 10 ? y1 - 5 : y1 + 15);
        ctx.fillText(`X:${X.toFixed(2)} Y:${Y.toFixed(2)} Z:${Z.toFixed(2)}`, x1, y2 + 15);
      }

      // ➤ Age Estimation
      if (det.age && det.bbox) {
        const [x1, y1, x2, y2] = det.bbox;

        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = 'blue';
        ctx.font = '14px Arial';
        ctx.fillText(`Age: ${det.age}`, x1, y1 > 10 ? y1 - 5 : y1 + 15);
      }

      // ➤ Activity Detection (show overlay top-center)
      if (det.predicted_activity) {
        ctx.fillStyle = 'orange';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`Activity: ${det.predicted_activity}`, 20, 30);

        ctx.font = '16px Arial';
        ctx.fillText(`Mean Intensity: ${det.mean_pixel_intensity.toFixed(1)}`, 20, 55);
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
        ctx.font = '14px Arial';
        ctx.fillText(`${label} (${confidence}%)`, x, y > 10 ? y - 5 : y + 15);
      }

      // ➤ Face Recognition
      if (det.name && det.bbox) {
        const [x, y, x2, y2] = det.bbox;
        const label = det.name;

        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, x2 - x, y2 - y);

        ctx.fillStyle = 'cyan';
        ctx.font = '14px Arial';
        ctx.fillText(`${label}`, x, y > 10 ? y - 5 : y + 15);
      }

      // ✅ ➤ Depth Estimation (center depth)
      if (det.center_depth !== undefined) {
        ctx.fillStyle = 'orange';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`Depth: ${det.center_depth.toFixed(1)} cm`, 20, 30);
      }
    });
  }, [detections]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Webcam
        ref={ref}
        audio={false}
        screenshotFormat="image/jpeg"
        width={640}
        height={480}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </div>
  );
});

export default WebcamFeed;
