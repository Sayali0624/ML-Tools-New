// src/App.js
import React, { useRef, useState, useEffect } from 'react';
import WebcamFeed from './components/WebcamFeed';
import { runFaceRecognition } from './models/faceRecognition';
import { runAgeEstimation } from './models/ageEstimation';
import { runEmotionDetection } from './models/emotionDetection';
import { runDepthEstimation } from './models/depthEstimation';
import { runObjectDetection } from './models/objectDetection';
import { runActivityDetection } from './models/activityDetection';

import { addNewFace } from './models/addFace';
import './App.css';
import * as faceapi from 'face-api.js';

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
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnknownFace, setHasUnknownFace] = useState(false); // State to track unknown faces
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [mediaStream, setMediaStream] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [modelStats, setModelStats] = useState({
    totalDetections: 0,
    sessionsRun: 0,
    successRate: 100
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedModelInfo, setExpandedModelInfo] = useState(null);

  const [isFaceApiModelsLoaded, setIsFaceApiModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleSetMode = (newMode) => {
    if (newMode === mode) return;

    if (newMode !== null) {
      setIsLoading(true);
      addNotification(`Switching to ${newMode.charAt(0).toUpperCase() + newMode.slice(1)} mode...`, 'info');
      setModelStats(prev => ({ ...prev, sessionsRun: prev.sessionsRun + 1 }));
    } else {
      setIsLoading(false);
      addNotification('Returned to dashboard', 'success');
    }

    setMode(newMode);
    setShowAddFaceInput(false);
    setNewFaceName('');
    setAddFaceMessage('');
    setDetections([]);
    setHeatmapImage(null);
    setExpandedModelInfo(null);
    setHasUnknownFace(false); // Reset unknown face status when changing mode
  };

  const toggleModelInfo = (key) => {
    setExpandedModelInfo(prevKey => (prevKey === key ? null : key));
  };

  const loadLabeledImages = async () => {
    const labels = ['Anjali']; // Ensure this array is accurate

    return Promise.all(
      labels.map(async label => {
        const descriptions = [];
        const fileName = `${label}-1.jpg`; // Adjust if your naming convention is different (e.g., Sayali_1.jpg)
        try {
          const img = await faceapi.fetchImage(`/labeled_images/${fileName}`);
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptions.push(detection.descriptor);
          } else {
            console.warn(`No face detected in /labeled_images/${fileName}. Ensure face is clear.`);
          }
        } catch (error) {
          console.error(`Error loading image /labeled_images/${fileName}:`, error);
        }
        
        if (descriptions.length === 0) {
          console.warn(`No descriptors found for label: ${label}. This person might not be recognized.`);
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  };

  const handleAddNewFace = async () => {
    if (!newFaceName.trim()) {
      addNotification('Please enter a name for the new face.', 'warning');
      setAddFaceMessage('Please enter a name for the new face.');
      return;
    }

    setAddFaceMessage('Adding face...');
    addNotification(`Adding new face: ${newFaceName.trim()}`, 'info');

    try {
      const updatedFaceMatcher = await addNewFace(webcamRef, newFaceName.trim(), faceMatcher);
      setFaceMatcher(updatedFaceMatcher);

      setAddFaceMessage(`Successfully added face: ${newFaceName.trim()}! Image downloaded.`);
      setNewFaceName('');
      setShowAddFaceInput(false);
      setHasUnknownFace(false); // Hide the add face option after successful addition
      addNotification(`Successfully added face: ${newFaceName.trim()}!`, 'success');
      addNotification(`Image saved to your downloads as ${newFaceName.trim()}-1.jpg`, 'info');

    } catch (error) {
      const errorMsg = `Failed to add face: ${error.message || 'Unknown error'}`;
      setAddFaceMessage(errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  useEffect(() => {
    const enableStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        if (webcamRef.current && webcamRef.current.video) {
          webcamRef.current.video.srcObject = stream;
        }
        setMediaStream(stream);
        addNotification('Camera connected successfully', 'success');
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setIsCameraOn(false);
        addNotification('Failed to access camera. Please check permissions.', 'error');
      }
    };

    const disableStream = () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        if (webcamRef.current && webcamRef.current.video) {
          webcamRef.current.video.srcObject = null;
        }
        setMediaStream(null);
        addNotification('Camera disconnected', 'info');
      }
    };

    if (isCameraOn) {
      enableStream();
    } else {
      disableStream();
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  useEffect(() => {
    const loadModelsAndData = async () => {
      setIsLoading(true);
      addNotification('Loading ML models...', 'info');
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
          faceapi.nets.ageGenderNet.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
        ]);
        setIsFaceApiModelsLoaded(true);
        addNotification('Face-api.js models loaded successfully!', 'success');

        const labeledDescriptors = await loadLabeledImages();
        // IMPORTANT: Consider adjusting this threshold (e.g., 0.5 to 0.65)
        // A lower value makes recognition stricter (more 'Unknown'), a higher value more lenient.
        setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
        addNotification('Labeled face data loaded for recognition.', 'success');

      } catch (error) {
        console.error("Error loading face-api.js models or data:", error);
        addNotification(`Failed to load face-api.js models: ${error.message}`, 'error');
        setIsLoading(false);
      }
    };

    if (!isFaceApiModelsLoaded) {
      loadModelsAndData();
    }
  }, [isFaceApiModelsLoaded]);

  useEffect(() => {
    if (!mode || !isCameraOn || !isFaceApiModelsLoaded) {
      setIsLoading(false);
      return;
    }

    let intervalId;

    const initializeAndRunModel = async () => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      setDetections([]);
      setHeatmapImage(null);
      setHasUnknownFace(false); // Reset unknown face status on mode change/init

      const modelRunFunctionMap = {
        face: runFaceRecognition,
        age: runAgeEstimation,
        depth: runDepthEstimation,
        object: runObjectDetection,
        emotion: runEmotionDetection,
        activity: runActivityDetection
      };

      const modelRunFunction = modelRunFunctionMap[mode];
    

      if (modelRunFunction && webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        try {
          const args = [webcamRef, setDetections];
          if (mode === 'face') {
            args.push(faceMatcher);
          } else if (mode === 'depth') {
            
            
            args[0] = webcamRef.current.video; // pass the actual video element instead of the ref
             //args.push(setHeatmapImage);
          }

          // Initial run
          const initialDetections = await modelRunFunction(...args);
          setIsLoading(false);
          addNotification(`${mode.charAt(0).toUpperCase() + mode.slice(1)} model loaded successfully`, 'success');

          // Initial run



          // Check for unknown faces after initial detection (only for face mode)
          // Ensure initialDetections is an array before calling .some()
          const unknownDetectedInitial = mode === 'face' && Array.isArray(initialDetections) && initialDetections.some(d => d.name === 'Unknown');
          setHasUnknownFace(unknownDetectedInitial);
          console.log('Initial Detections:', initialDetections); // NEW: Log initial detections
          console.log('Initial unknown face detected?', unknownDetectedInitial); // Debug log


          intervalId = setInterval(async () => {
            if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
              const currentDetections = await modelRunFunction(...args);
              // Update hasUnknownFace based on continuous detections
              const unknownDetectedContinuous = mode === 'face' && Array.isArray(currentDetections) && currentDetections.some(d => d.name === 'Unknown');
              setHasUnknownFace(unknownDetectedContinuous);
              // console.log('Continuous Detections:', currentDetections); // NEW: Log continuous detections (can be noisy)
              // console.log('Continuous unknown face detected?', unknownDetectedContinuous); // Debug log (can be noisy)
            }
          }, 100);
        } catch (error) {
          setIsLoading(false);
          addNotification(`Failed to run ${mode} model: ${error.message}`, 'error');
          console.error(`Error running ${mode} model:`, error);
          setModelStats(prev => ({ ...prev, successRate: Math.max(0, prev.successRate - 10) }));
        }
      } else {
        setIsLoading(false);
        if (intervalId) clearInterval(intervalId);
        if (!isFaceApiModelsLoaded) {
          addNotification('Waiting for ML models to load...', 'info');
        } else if (!isCameraOn) {
          addNotification('Camera is off. Please turn it on to start detection.', 'info');
        } else if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState !== 4) {
          addNotification('Waiting for camera stream to be ready...', 'info');
        }
      }
    };

    initializeAndRunModel();
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mode, isCameraOn, isFaceApiModelsLoaded, faceMatcher]);

  const toggleCamera = () => {
    setIsCameraOn(prev => !prev);
    setMode(null);
    setDetections([]);
    setHeatmapImage(null);
    setIsLoading(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
    setExpandedModelInfo(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getDetectionSummary = () => {
    if (!isCameraOn) {
      return "Camera is off. Turn on camera to enable ML functionalities.";
    }
    if (!mode) {
      return "Select an ML mode from the sidebar to begin analysis.";
    }
    if (isLoading) {
      return `Loading ${mode.charAt(0).toUpperCase() + mode.slice(1)} model...`;
    }
    if (!isFaceApiModelsLoaded) {
      return "Loading core ML models. Please wait...";
    }

    if (detections && detections.length > 0) {
      switch (mode) {
        case 'face':
          const unknownFaces = detections.filter(d => d.name === 'Unknown').length;
          const knownFaces = detections.length - unknownFaces;
          if (unknownFaces > 0 && knownFaces > 0) {
            return `${knownFaces} known face(s) and ${unknownFaces} unknown face(s) detected.`;
          } else if (knownFaces > 0) {
            return `${knownFaces} known face(s) detected.`;
          } else if (unknownFaces > 0) {
            // Updated summary message to be more explicit for unknown
            return `⚠️ ${unknownFaces} unknown face(s) detected. Click "+ Add Face" to register.`;
          }
          return `${detections.length} face(s) detected.`;
        case 'age':
          return `${detections.length} face(s) with age estimated.`;
        case 'emotion':
          return `${detections.length} face(s) with emotion detected.`;
        case 'object':
          const objectNames = detections.map(d => d.class).join(', ');
          return `${detections.length} object(s) detected: ${objectNames}.`;
        case 'activity':
          const activityNames = detections.map(d => d.activity).join(', ');
          return `${detections.length} activity(ies) detected: ${activityNames}.`;
        case 'depth':
          return "Depth estimation active (heatmap displayed).";
        default:
          return "Active mode with detections.";
      }
    }
    return `No recent detections for ${mode ? mode.replace(/([A-Z])/g, ' $1').trim() : 'selected mode'}.`;
  };

  const mlModes = [
    {
      label: 'Face Recognition',
      key: 'face',
      icon: faceIcon,
      description: 'Detect and identify faces',
      info: 'Identifies known faces and flags unknown ones. Useful for security and personalized experiences.',
      usageGuide: '1. Select "Face Recognition".\n2. Position your face clearly in the camera.\n3. If an "Unknown" face is detected, click "+ Add Face" to register it.'
    },
    {
      label: 'Age Estimation',
      key: 'age',
      icon: ageIcon,
      description: 'Estimate age from faces',
      info: 'Estimates the age of individuals detected in the camera feed. Provides an approximate age range.',
      usageGuide: '1. Select "Age Estimation".\n2. Ensure faces are well-lit and clearly visible.\n3. The estimated age will appear near detected faces.'
    },
    {
      label: 'Emotion Detection',
      key: 'emotion',
      icon: emotionIcon,
      description: 'Detect facial emotions',
      info: 'Analyzes facial expressions to detect primary emotions like happiness, sadness, anger, etc.',
      usageGuide: '1. Select "Emotion Detection".\n2. Display various emotions to the camera.\n3. Detected emotions will be labeled on faces.'
    },
    {
      label: 'Activity Detection',
      key: 'activity',
      icon: activityIcon,
      description: 'Recognize activities',
      info: 'Identifies common human activities suchs as walking, running, standing, and sitting.',
      usageGuide: '1. Select "Activity Detection".\n2. Perform various actions in front of the camera.\n3. The detected activity will be displayed on screen.'
    },
    {
      label: 'Object Detection',
      key: 'object',
      icon: objectIcon,
      description: 'Identify objects in scene',
      info: 'Detects and classifies a wide range of objects in the camera feed, providing bounding boxes and labels.',
      usageGuide: '1. Select "Object Detection".\n2. Point the camera at different objects.\n3. Detected objects will be highlighted with labels and confidence scores.'
    },
    {
      label: 'Depth Estimation',
      key: 'depth',
      icon: depthIcon,
      description: 'Generate depth heatmap',
      info: 'Creates a real-time heatmap showing the depth of objects in the scene. Closer objects appear brighter.',
      usageGuide: '1. Select "Depth Estimation".\n2. The heatmap will appear below the webcam feed.\n3. Move objects closer or further to see depth changes.'
    }
  ];

  return (
    <div className={`app-layout font-inter bg-gray-900 text-white min-h-screen flex ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="notification-container">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="notification-content">
              <div className="notification-icon">
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
              </div>
              <div className="notification-text">
                <p>{notification.message}</p>
                <small>{notification.timestamp.toLocaleTimeString()}</small>
              </div>
            </div>
            <button className="notification-close">×</button>
          </div>
        ))}
      </div>

      <div className={`navbar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="navbar-header">
          <h2 className="navbar-title" onClick={() => handleSetMode(null)}>
            {sidebarCollapsed ? 'ML' : 'ML Dashboard'}
          </h2>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <div className="camera-controls">
          <button className="camera-toggle-button" onClick={toggleCamera}>
            <span className={`camera-icon ${isCameraOn ? 'on' : 'off'}`}></span>
            {!sidebarCollapsed && <span>{isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}</span>}
          </button>

          {!sidebarCollapsed && (
            <button className="fullscreen-button" onClick={toggleFullscreen}>
              <span>{isFullscreen ? '🗗' : '🗖'}</span>
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
          )}
        </div>

        <div className="navbar-content">
          <div className="time-widget">
            <div className="time">{currentTime.toLocaleTimeString()}</div>
            <div className="date">{currentTime.toDateString()}</div>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">ML Models</h3>
            {mlModes.map(tool => (
              <React.Fragment key={tool.key}>
                <div
                  className={`nav-item ${mode === tool.key ? 'active-nav-item' : ''}`}
                  onClick={() => handleSetMode(tool.key)}
                >
                  <img src={tool.icon} alt={`${tool.label} Icon`} className="nav-item-icon" />
                  {!sidebarCollapsed && (
                    <div className="nav-item-content">
                      <span className="nav-item-label">{tool.label}</span>
                      <small className="nav-item-desc">{tool.description}</small>
                    </div>
                  )}
                  {!sidebarCollapsed && (
                    <button
                      className={`info-toggle-arrow ${expandedModelInfo === tool.key ? 'expanded' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModelInfo(tool.key);
                      }}
                    >
                      {expandedModelInfo === tool.key ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {!sidebarCollapsed && expandedModelInfo === tool.key && (
                  <div className="model-info-expanded">
                    <h5>About {tool.label}</h5>
                    <p>{tool.info}</p>
                    <h5>How to Use:</h5>
                    <pre>{tool.usageGuide}</pre>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {!sidebarCollapsed && (
            <div className="nav-stats">
              <h3 className="nav-section-title">Session Stats</h3>
              <div className="stat-item">
                <span>Detections</span>
                <span className="stat-value">{modelStats.totalDetections}</span>
              </div>
              <div className="stat-item">
                <span>Sessions</span>
                <span className="stat-value">{modelStats.sessionsRun}</span>
              </div>
              <div className="stat-item">
                <span>Success Rate</span>
                <span className="stat-value">{modelStats.successRate}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {mode === null ? (
          <div className="dashboard-container">
            <div className="dashboard-grid">
              <div className="dashboard-card dashboard-header-card">
                <div className="header-content">
                  <h3 className="dashboard-title">
                    Welcome to ML Dashboard
                    <span className="wave-animation">👋</span>
                  </h3>
                  <p className="dashboard-intro-text">
                    Choose from our advanced machine learning models to analyze your camera feed in real-time
                  </p>
                  <div className="quick-actions">
                    <button
                      className="quick-action-btn primary"
                      onClick={() => handleSetMode('face')}
                      disabled={!isCameraOn || !isFaceApiModelsLoaded}
                    >
                      <img src={faceIcon} alt="Face" />
                      Start Face Recognition
                    </button>
                    <button
                      className="quick-action-btn secondary"
                      onClick={() => handleSetMode('object')}
                      disabled={!isCameraOn || !isFaceApiModelsLoaded}
                    >
                      <img src={objectIcon} alt="Object" />
                      Detect Objects
                    </button>
                  </div>
                </div>
              </div>

              <div className="dashboard-card model-gallery-card">
                <h4 className="card-title">Available ML Models</h4>
                <div className="model-gallery">
                  {mlModes.map(model => (
                    <div
                      key={model.key}
                      className={`model-card ${!isCameraOn || !isFaceApiModelsLoaded ? 'disabled' : ''}`}
                      onClick={() => (isCameraOn && isFaceApiModelsLoaded) && handleSetMode(model.key)}
                    >
                      <img src={model.icon} alt={model.label} className="model-icon" />
                      <h5>{model.label}</h5>
                      <p>{model.description}</p>
                      <div className="model-status">
                        {mode === model.key ? (
                          <span className="status-badge active">Active</span>
                        ) : (
                          <span className="status-badge ready">Ready</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-card dashboard-status-card">
                <h4 className="card-title">System Status</h4>
                <div className="status-grid">
                  <div className="status-item">
                    <div className="status-icon camera">📹</div>
                    <div className="status-info">
                      <span className="status-label">Camera</span>
                      <span className={`status-value ${isCameraOn ? 'online' : 'offline'}`}>
                        {isCameraOn ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon ml">🤖</div>
                    <div className="status-info">
                      <span className="status-label">ML Engine</span>
                      <span className={`status-value ${mode ? 'active' : 'standby'}`}>
                        {mode ? `Running ${mode}` : 'Standby'}
                      </span>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon performance">⚡</div>
                    <div className="status-info">
                      <span className="status-label">Performance</span>
                      <span className="status-value good">Excellent</span>
                    </div>
                  </div>
                </div>

                <div className="system-summary">
                  <p className="summary-text">{getDetectionSummary()}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="ml-mode-container">
            <div className="mode-header">
              <div className="mode-info">
                <img
                  src={mlModes.find(m => m.key === mode)?.icon}
                  alt={mode}
                  className="mode-icon"
                />
                <div>
                  <h2 className="mode-title">
                    {mlModes.find(m => m.key === mode)?.label || mode}
                  </h2>
                  <p className="mode-description">
                    {mlModes.find(m => m.key === mode)?.description}
                  </p>
                </div>
              </div>
              <div className="mode-controls">
                <button className="btn-secondary" onClick={() => handleSetMode(null)}>
                  ← Back to Dashboard
                </button>
                {/* Only show Add Face button if in face recognition mode AND an unknown face is detected */}
                {mode === 'face' && hasUnknownFace && (
                  <button
                    className="btn-primary"
                    onClick={() => setShowAddFaceInput(!showAddFaceInput)}
                  >
                    {showAddFaceInput ? 'Cancel' : '+ Add Face'}
                  </button>
                )}
              </div>
            </div>

            <div className="webcam-container">
              <div className="webcam-feed-wrapper-large">
                {isCameraOn ? (
                  <WebcamFeed ref={webcamRef} detections={detections} mode={mode} />
                ) : (
                  <div className="camera-off-message">
                    <div className="camera-off-icon">📷</div>
                    <p>Camera is OFF</p>
                    <p>Click "Turn Camera On" to activate.</p>
                    <button className="btn-primary" onClick={toggleCamera}>
                      Turn Camera On
                    </button>
                  </div>
                )}
                {isLoading && isCameraOn && (
                  <div className="loading-overlay">
                    <div className="loading-content">
                      <div className="spinner"></div>
                      <p>Loading {mode} model...</p>
                      <small>This may take a few seconds</small>
                    </div>
                  </div>
                )}
              </div>

              <div className="results-panel">
                <h4>Detection Results</h4>
                <div className="results-summary">
                  <span className="result-count">{detections.length}</span>
                  <span className="result-label">
                    {mode === 'face' ? 'Face(s)' :
                     mode === 'object' ? 'Object(s)' :
                     mode === 'activity' ? 'Activity(ies)' :
                     mode === 'emotion' ? 'Emotion(s)' :
                     mode === 'age' ? 'Age(s)' : 'Detection(s)'}
                  </span>
                </div>

                <div className="results-list">
                  {detections.slice(0, 5).map((detection, index) => (
                    <div key={index} className="result-item">
                      <div className="result-info">
                        <strong>
                          {detection.name || detection.class || detection.activity || detection.emotion || 'Detection'}
                        </strong>
                        {detection.confidence && (
                          <span className="confidence">
                            {(detection.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                        {detection.age && (
                          <span className="age">Age: {detection.age.toFixed(0)}</span>
                        )}
                         {detection.gender && (
                          <span className="gender">Gender: {detection.gender}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {mode === 'depth' && heatmapImage && (
                  <div className="depth-heatmap-hint">
                    <p>Scroll down to view Depth Heatmap 👇</p>
                  </div>
                )}
              </div>

              {mode === 'depth' && heatmapImage && (
                <div className="heatmap-container">
                  <h4>Depth Heatmap</h4>
                  <img
                    src={heatmapImage}
                    alt="Depth Heatmap"
                    className="heatmap-image"
                  />
                </div>
              )}
            </div>

            {mode === 'face' && showAddFaceInput && (
              <div className="add-face-container">
                <div className="add-face-card">
                  <button
                    onClick={() => setShowAddFaceInput(false)}
                    className="btn-back-add-face"
                  >
                    ← Back
                  </button>
                  <h4>Add New Face</h4>
                  <p>Enter a name and capture the face currently visible in the camera</p>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Enter person's name"
                      value={newFaceName}
                      onChange={(e) => setNewFaceName(e.target.value)}
                      className="face-name-input"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewFace()}
                    />
                    <button
                      onClick={handleAddNewFace}
                      className="btn-success"
                      disabled={!newFaceName.trim()}
                    >
                      📸 Capture & Add
                    </button>
                  </div>
                  {addFaceMessage && (
                    <div className={`message ${addFaceMessage.includes('Success') ? 'success' : addFaceMessage.includes('Failed') ? 'error' : 'info'}`}>
                      {addFaceMessage}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Status Messages for Face Recognition */}
            {mode === 'face' && detections.length > 0 && (
              <div className={`status-message ${hasUnknownFace ? 'warning' : 'success'}`}>
                {hasUnknownFace ? '⚠️ Unknown face(s) detected. Click "+ Add Face" to register.' : '✅ All detected faces are recognized.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;