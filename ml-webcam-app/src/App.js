// src/App.js
import React, { useRef, useState, useEffect } from 'react';
import WebcamFeed from './components/WebcamFeed';
import { runFaceRecognition } from './models/faceRecognition';
import { runAgeEstimation } from './models/ageEstimation';
import { runDepthEstimation } from './models/depthEstimation';
import { runEmotionDetection } from './models/emotionDetection';
import { runObjectDetection } from './models/objectDetection';
import { runActivityDetection } from './models/activityDetection';

import { addNewFace } from './models/addFace';
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
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnknownFace, setHasUnknownFace] = useState(false);
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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Enhanced notification system
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Enhanced mode selection with analytics
  const handleSetMode = (newMode) => {
    if (newMode === mode) return; // Prevent unnecessary re-renders

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
  };

  // Enhanced face addition with better UX
  const handleAddNewFace = async () => {
    if (!newFaceName.trim()) {
      addNotification('Please enter a name for the new face.', 'warning');
      setAddFaceMessage('Please enter a name for the new face.');
      return;
    }
    
    setAddFaceMessage('Adding face...');
    addNotification(`Adding new face: ${newFaceName.trim()}`, 'info');
    
    try {
      const message = await addNewFace(webcamRef, newFaceName.trim());
      setAddFaceMessage(message);
      setNewFaceName('');
      setShowAddFaceInput(false);
      addNotification(`Successfully added face: ${newFaceName.trim()}`, 'success');
    } catch (error) {
      const errorMsg = `Failed to add face: ${error.message || 'Unknown error'}`;
      setAddFaceMessage(errorMsg);
      addNotification(errorMsg, 'error');
    }
  };

  // Enhanced camera management
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
        if (webcamRef.current) {
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

  // Enhanced ML model execution with better error handling
  useEffect(() => {
    if (!mode || !isCameraOn) {
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

      const modelMap = {
        face: runFaceRecognition,
        age: runAgeEstimation,
        depth: runDepthEstimation,
        object: runObjectDetection,
        emotion: runEmotionDetection,
        activity: runActivityDetection
      };

      const modelRunFunction = modelMap[mode];

      if (modelRunFunction && webcamRef.current && webcamRef.current.video.readyState === 4) {
        try {
          if (mode === 'face') {
            await modelRunFunction(webcamRef, (newDetections) => {
              setDetections(newDetections);
              const containsUnknown = newDetections.some(det => det.name === 'Unknown');
              setHasUnknownFace(containsUnknown);
              setModelStats(prev => ({ 
                ...prev, 
                totalDetections: prev.totalDetections + newDetections.length 
              }));
            });
          } else if (mode === 'depth') {
            await modelRunFunction(webcamRef, setDetections, setHeatmapImage);
          } else {
            await modelRunFunction(webcamRef, (newDetections) => {
              setDetections(newDetections);
              setModelStats(prev => ({ 
                ...prev, 
                totalDetections: prev.totalDetections + (newDetections?.length || 0) 
              }));
            });
          }
          setIsLoading(false);
          addNotification(`${mode.charAt(0).toUpperCase() + mode.slice(1)} model loaded successfully`, 'success');

          intervalId = setInterval(() => {
            if (webcamRef.current && webcamRef.current.video.readyState === 4) {
              if (mode === 'face') {
                modelRunFunction(webcamRef, (newDetections) => {
                  setDetections(newDetections);
                  const containsUnknown = newDetections.some(det => det.name === 'Unknown');
                  setHasUnknownFace(containsUnknown);
                });
              } else if (mode === 'depth') {
                modelRunFunction(webcamRef, setDetections, setHeatmapImage);
              } else {
                modelRunFunction(webcamRef, setDetections);
              }
            }
          }, 1000);
        } catch (error) {
          setIsLoading(false);
          addNotification(`Failed to load ${mode} model: ${error.message}`, 'error');
          setModelStats(prev => ({ ...prev, successRate: Math.max(0, prev.successRate - 10) }));
        }
      } else {
        setIsLoading(false);
        if (intervalId) clearInterval(intervalId);
      }
    };

    initializeAndRunModel();
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mode, isCameraOn]);

  const toggleCamera = () => {
    setIsCameraOn(prev => !prev);
    setMode(null);
    setDetections([]);
    setHeatmapImage(null);
    setIsLoading(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
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
            return `${unknownFaces} unknown face(s) detected.`;
          }
          return `${detections.length} face(s) detected.`;
        case 'age':
          return `${detections.length} age(s) estimated.`;
        case 'emotion':
          return `${detections.length} emotion(s) detected.`;
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
    { label: 'Face Recognition', key: 'face', icon: faceIcon, description: 'Detect and identify faces' },
    { label: 'Age Estimation', 'key': 'age', icon: ageIcon, description: 'Estimate age from faces' },
    { label: 'Depth Estimation', key: 'depth', icon: depthIcon, description: 'Generate depth heatmap' },
    { label: 'Emotion Detection', key: 'emotion', icon: emotionIcon, description: 'Detect facial emotions' },
    { label: 'Activity Detection', key: 'activity', icon: activityIcon, description: 'Recognize activities' },
    { label: 'Object Detection', key: 'object', icon: objectIcon, description: 'Identify objects in scene' }
  ];

  return (
    <div className={`app-layout font-inter bg-gray-900 text-white min-h-screen flex ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Enhanced Notification System */}
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

      {/* Enhanced Navigation Bar */}
      <div className={`navbar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="navbar-header">
          <h2 className="navbar-title" onClick={() => handleSetMode(null)}>
            {sidebarCollapsed ? 'ML' : 'ML Dashboard'}
          </h2>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* MOVED: Enhanced Camera Controls - Now directly below navbar-header */}
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
          {/* Current Time */}
          <div className="time-widget">
            <div className="time">{currentTime.toLocaleTimeString()}</div>
            <div className="date">{currentTime.toDateString()}</div>
          </div>

          {/* ML Mode Navigation */}
          <div className="nav-section">
            <h3 className="nav-section-title">ML Models</h3>
            {mlModes.map(tool => (
              <div
                key={tool.key}
                className={`nav-item ${mode === tool.key ? 'active-nav-item' : ''}`}
                onClick={() => handleSetMode(tool.key)}
                title={tool.description}
              >
                <img src={tool.icon} alt={`${tool.label} Icon`} className="nav-item-icon" />
                {!sidebarCollapsed && (
                  <div className="nav-item-content">
                    <span className="nav-item-label">{tool.label}</span>
                    <small className="nav-item-desc">{tool.description}</small>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Stats */}
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
        </div> {/* End of navbar-content */}
      </div>

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {mode === null ? (
          /* Enhanced Dashboard Overview */
          <div className="dashboard-container">
            <div className="dashboard-grid">
              {/* Welcome Header */}
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
                      disabled={!isCameraOn}
                    >
                      <img src={faceIcon} alt="Face" />
                      Start Face Recognition
                    </button>
                    <button 
                      className="quick-action-btn secondary" 
                      onClick={() => handleSetMode('object')}
                      disabled={!isCameraOn}
                    >
                      <img src={objectIcon} alt="Object" />
                      Detect Objects
                    </button>
                  </div>
                </div>
              </div>

              {/* Model Gallery */}
              <div className="dashboard-card model-gallery-card">
                <h4 className="card-title">Available ML Models</h4>
                <div className="model-gallery">
                  {mlModes.map(model => (
                    <div 
                      key={model.key} 
                      className={`model-card ${!isCameraOn ? 'disabled' : ''}`}
                      onClick={() => isCameraOn && handleSetMode(model.key)}
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

              {/* Enhanced System Status */}
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
          /* Enhanced ML Mode View */
          <div className="ml-mode-container">
            {/* Mode Header */}
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

            {/* Main Content */}
            <div className="webcam-container">
              <div className="webcam-feed-wrapper-large">
                {isCameraOn ? (
                  <WebcamFeed ref={webcamRef} detections={detections} />
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

              {/* Detection Results Panel */}
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
                          <span className="age">Age: {detection.age}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* New: Hint for Depth Heatmap */}
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

            {/* Face Addition Interface */}
            {/* This modal should only appear if showAddFaceInput is true, regardless of hasUnknownFace,
                as the user explicitly clicked the button. */}
            {mode === 'face' && showAddFaceInput && (
              <div className="add-face-container">
                <div className="add-face-card">
                  {/* Added Back Button */}
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
            {/* Status Messages */}
            {mode === 'face' && !hasUnknownFace && detections.length > 0 && (
              <div className="status-message success">
                ✅ All detected faces are recognized
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
