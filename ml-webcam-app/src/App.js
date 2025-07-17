// src/App.js
import React, { useRef, useState, useEffect } from 'react';
import WebcamFeed from './components/WebcamFeed';
import { runFaceRecognition } from './models/faceRecognition';
import { runAgeEstimation } from './models/ageEstimation';
import { runDepthEstimation } from './models/depthEstimation';
import { runEmotionDetection } from './models/emotionDetection';
import { runObjectDetection } from './models/objectDetection';
import { runActivityDetection } from './models/activityDetection';

import { addNewFace } from './models/addFace'; // Import addNewFace
import './App.css';

// Import your image assets here
import faceIcon from './assets/face-icon.png';
import ageIcon from './assets/age-icon.png';
import depthIcon from './assets/depth-icon.png';
import emotionIcon from './assets/emotion-icon.png';
import objectIcon from './assets/object-icon.png';
import activityIcon from './assets/activity-icon.png';

function App() {
  const webcamRef = useRef(null);
  const [mode, setMode] = useState(null);
  const [detections, setDetections] = useState([]);
  const [heatmapImage, setHeatmapImage] = useState(null);
  const [showAddFaceInput, setShowAddFaceInput] = useState(false);
  const [newFaceName, setNewFaceName] = useState('');
  const [addFaceMessage, setAddFaceMessage] = useState('');

  const handleSetMode = (newMode) => {
    setMode(newMode);
    setShowAddFaceInput(false);
    setNewFaceName('');
    setAddFaceMessage('');
  };

  const handleAddNewFace = async () => {
    if (!newFaceName.trim()) {
      setAddFaceMessage('Please enter a name for the new face.');
      return;
    }
    setAddFaceMessage('Adding face...');
    try {
      const message = await addNewFace(webcamRef, newFaceName.trim());
      setAddFaceMessage(message);
      setNewFaceName('');
      setShowAddFaceInput(false);
    } catch (error) {
      setAddFaceMessage(`Failed to add face: ${error.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (!mode) return;

    const runModel = () => {
      if (mode === 'face') runFaceRecognition(webcamRef, setDetections);
      else if (mode === 'age') runAgeEstimation(webcamRef, setDetections);
      else if (mode === 'depth') runDepthEstimation(webcamRef, setDetections, setHeatmapImage);
      else if (mode === 'object') runObjectDetection(webcamRef, setDetections);
      else if (mode === 'emotion') runEmotionDetection(webcamRef, setDetections);
      else if (mode === 'activity') runActivityDetection(webcamRef, setDetections);
    };

    const interval = setInterval(runModel, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  return (
    <div className="app-layout font-inter bg-gray-900 text-white min-h-screen flex">
      {/* Navigation Bar */}
      <div className="navbar w-64 bg-gray-800 p-6 flex flex-col items-start space-y-4 rounded-r-lg shadow-lg">
        <h2 className="text-2xl font-bold text-orange-400 mb-6">ML Tools</h2>
        {[{ label: 'Face Recognition', key: 'face', icon: faceIcon },
          { label: 'Age Estimation', key: 'age', icon: ageIcon },
          { label: 'Depth Estimation', key: 'depth', icon: depthIcon },
          { label: 'Emotion Detection', key: 'emotion', icon: emotionIcon },
          { label: 'Activity Detection', key: 'activity', icon: activityIcon },
          { label: 'Object Detection', key: 'object', icon: objectIcon }].map(tool => (
            <div
              key={tool.key}
              className="nav-item flex items-center space-x-3 p-3 w-full rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200"
              onClick={() => handleSetMode(tool.key)}
            >
              <img src={tool.icon} alt={`${tool.label} Icon`} className="nav-item-icon w-6 h-6" />
              <span>{tool.label}</span>
            </div>
          ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 flex flex-col items-center">
        <div className="webcam-container flex justify-center items-start gap-6">
          <div style={{ position: 'relative' }}>
            <WebcamFeed ref={webcamRef} detections={detections} />
          </div>

          {mode === 'depth' && heatmapImage && (
            <div className="p-2 rounded shadow border bg-white">
              <h4 style={{ color: '#FF6F00', marginBottom: '8px', textAlign: 'center' }}>
                Depth Heatmap
              </h4>
              <img
                src={heatmapImage}
                alt="Depth Heatmap"
                width={640}
                height={480}
                style={{ borderRadius: '8px', display: 'block' }}
              />
            </div>
          )}
        </div>

        {mode === 'face' && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg shadow-md w-full max-w-md flex flex-col items-center">
            <button
              onClick={() => setShowAddFaceInput(!showAddFaceInput)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md"
            >
              {showAddFaceInput ? 'Hide Add Face' : 'Add New Face'}
            </button>

            {showAddFaceInput && (
              <div className="mt-4 w-full flex flex-col items-center space-y-3">
                <input
                  type="text"
                  placeholder="Enter name for new face"
                  value={newFaceName}
                  onChange={(e) => setNewFaceName(e.target.value)}
                  className="p-2 w-full max-w-xs rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddNewFace}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md"
                >
                  Capture & Add Face
                </button>
              </div>
            )}
            {addFaceMessage && (
              <p className="mt-3 text-sm text-center text-orange-300">{addFaceMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
