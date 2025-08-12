// src/models/depthEstimation.js
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as depth from '@tensorflow-models/depth-estimation';

export async function runDepthEstimation(source) {
  try {
    if (
      !(source instanceof HTMLVideoElement ||
        source instanceof HTMLImageElement ||
        source instanceof HTMLCanvasElement)
    ) {
      throw new Error(
        'Source must be a video, image, or canvas element. Got: ' + typeof source
      );
    }

    await tf.setBackend('webgl');
    await tf.ready();

    const selectedModel = depth.SupportedModels.ARPortraitDepth;
    const estimator = await depth.createEstimator(selectedModel);

    const depthMap = await estimator.estimateDepth(source, {
      minDepth: 0,
      maxDepth: 1,
    });

    console.log('Depth map tensor:', depthMap);

    return depthMap; // Caller can decide how to visualize
  } catch (err) {
    console.error('Error running depth model:', err);
    throw err;
  }
}
