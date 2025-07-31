// src/models/objectDetection.js

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null; // Declare model outside to load once

export const runObjectDetection = async (webcamRef, setDetections) => {
    // Load the COCO-SSD model only once
    if (!model) {
        console.log('Loading COCO-SSD model...');
        model = await cocoSsd.load();
        console.log('COCO-SSD model loaded.');
    }

    if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;

        // Make a prediction
        const predictions = await model.detect(video);

        // Format detections for your App.js structure (assuming it expects 'class', 'score', 'bbox')
        const formattedDetections = predictions.map(prediction => ({
            class: prediction.class,
            confidence: prediction.score,
            bbox: prediction.bbox, // [x, y, width, height]
        }));

        setDetections(formattedDetections);
        return formattedDetections;
    }
    return [];
};

// Optional: Function to dispose of the model resources if needed when mode changes or app unmounts
export const disposeObjectDetectionModel = () => {
    if (model) {
        model.dispose();
        model = null;
        console.log('COCO-SSD model disposed.');
    }
};