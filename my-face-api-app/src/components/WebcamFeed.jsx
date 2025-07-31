// src/components/WebcamFeed.js
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const WebcamFeed = forwardRef(({ detections, mode }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Expose the video and canvas elements to the parent component (App.js)
  useImperativeHandle(ref, () => ({
    get video() {
      return videoRef.current?.video;
    },
    get canvas() {
      return canvasRef.current;
    },
  }));

  // Effect to handle drawing detections on the canvas
  useEffect(() => {
    const video = videoRef.current?.video;
    const canvas = canvasRef.current;

    // Ensure video and canvas are ready
    if (!video || !canvas || video.readyState !== 4) return;

    // Get the actual video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Set canvas dimensions to match video dimensions
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const displaySize = { width: videoWidth, height: videoHeight };
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

    if (!detections || detections.length === 0) return;

    // --- Apply main mirroring transformation to the canvas context for all drawings ---
    context.save();
    context.scale(-1, 1);
    context.translate(-canvas.width, 0);

    // Resize detections to the current display size (which is now video's intrinsic size)
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Set common text drawing properties
    context.font = '26px Arial'; // Adjust font size and family as needed
    context.lineWidth = 2; // For the outline of the box
    context.strokeStyle = '#00FFFF'; // Cyan color for the box outline
    
    // Draw detections and labels based on the current mode
    resizedDetections.forEach(detection => {
      const box = detection.detection ? detection.detection.box : detection.box; // Handle different detection structures
      let label = '';

      if (mode === 'face') {
        label = detection.name || 'Unknown';
      } else if (mode === 'age') {
        label = `Age: ${detection.age ? detection.age.toFixed(0) : 'N/A'}, Gender: ${detection.gender || 'N/A'}`;
      } else if (mode === 'emotion') {
        const expressions = detection.expressions;
        if (expressions) {
          const maxValue = Math.max(...Object.values(expressions));
          const emotion = Object.keys(expressions).find(
            key => expressions[key] === maxValue
          ) || 'neutral';
          label = `Emotion: ${emotion || 'N/A'}`;
        }
      } else if (mode === 'object' || mode === 'activity') {
        const itemLabel = detection.class || detection.activity;
        const score = detection.score;
        if (itemLabel && score !== undefined) {
          label = `${itemLabel} (${(score * 100).toFixed(1)}%)`;
        }
      }

      // Draw the bounding box (already mirrored by the main context transformation)
      if (box) {
        const drawBox = new faceapi.draw.DrawBox(box, { label: '' }); // Label is drawn separately
        drawBox.draw(context);

        // --- Text Drawing with Reverse Mirroring for Correct Orientation ---
        context.save(); // Save the context state (which is currently flipped for boxes)

        const textX = box.x + box.width / 2;
        const textY = box.y - 10; // Position text 10px above the box

        // Translate the origin to the text's desired center point (in the currently flipped coordinate system)
        context.translate(textX, textY);
        // Apply a horizontal flip around this new origin
        context.scale(-1, 1);
        
        // Now, draw the text at (0,0) relative to this new, flipped origin
        // The text will be drawn un-reversed and centered correctly.
        context.textAlign = 'center'; // Ensure text is centered around the new origin (0,0)
        context.textBaseline = 'bottom'; // Align text to the bottom of the bounding box

        // Draw text background for better readability
        const textMetrics = context.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = parseInt(context.font, 10); // Get font height
        
        context.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent black background
        // The rect coordinates are relative to the new origin (0,0)
        context.fillRect(-textWidth / 2 - 5, -textHeight - 5, textWidth + 10, textHeight + 10);
        
        context.fillStyle = '#00FFFF'; // Text color
        context.fillText(label, 0, 0); // Draw at the new origin (0,0)
        
        context.restore(); // Restore context after drawing text
        // --- End Text Drawing with Reverse Mirroring ---
      }
    });

    // Restore the canvas context to its original (unflipped) state
    context.restore();
    // --- END IMPORTANT FIX ---

  }, [detections, mode]); // Redraw when detections or mode changes

  return (
    <>
      {/* The Webcam component renders the video stream */}
      <Webcam
        mirrored={true} // Set to true for front camera, false for back camera
        audio={false}
        ref={videoRef}
        screenshotFormat="image/jpeg"
        imageSmoothing={true}
        className="webcam-feed" // Apply styling for the video element
        onLoadedData={() => { // Changed from onLoadedMetadata to onLoadedData for more reliable video dimensions
          if (videoRef.current && canvasRef.current) {
            const videoElement = videoRef.current.video;
            const canvasElement = canvasRef.current;
            // Set canvas dimensions to match the intrinsic video dimensions
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            // Also ensure faceapi knows the correct dimensions for resizing detections
            faceapi.matchDimensions(canvasElement, { width: videoElement.videoWidth, height: videoElement.videoHeight });
          }
        }}
      />
      {/* The Canvas element overlays the video for drawing detections */}
      <canvas ref={canvasRef} className="webcam-canvas" />
    </>
  );
});

export default WebcamFeed;
