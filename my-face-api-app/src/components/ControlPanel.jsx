import React from 'react';

const ControlPanel = ({ onModeChange }) => (
  <div className="mt-4 flex gap-4 justify-center flex-wrap">
    <button onClick={() => onModeChange('face')} className="px-4 py-2 bg-blue-500 text-white rounded">Face Recognition</button>
    <button onClick={() => onModeChange('age')} className="px-4 py-2 bg-green-500 text-white rounded">Age Estimation</button>
    <button onClick={() => onModeChange('depth')} className="px-4 py-2 bg-purple-500 text-white rounded">Depth Estimation</button>
    <button onClick={() => onModeChange('emotion')} className="px-4 py-2 bg-yellow-500 text-white rounded">Emotion Detection</button>
    <button
  onClick={() => {
    const name = prompt('Enter name for the new face:');
    if (name) {
      window.dispatchEvent(new CustomEvent('addFace', { detail: name }));
    }
  }}
  className="px-4 py-2 bg-orange-500 text-white rounded"
>
  Add Face
</button>

    
    <button onClick={() => onModeChange('object')} className="px-4 py-2 bg-red-500 text-white rounded">Object Detection</button>
  </div>
);

export default ControlPanel;
