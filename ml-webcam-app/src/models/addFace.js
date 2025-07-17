import axios from 'axios';

export const addNewFace = async (webcamRef, name) => {
  if (!webcamRef.current || !webcamRef.current.video) {
    throw new Error('Webcam not active or video element not found.');
  }

  const video = webcamRef.current.video;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
  const formData = new FormData();
  formData.append('image', blob, 'face.jpg');
  formData.append('name', name);

  try {
    const response = await axios.post('http://localhost:5000/add_face', formData);
    // Instead of alert, return the message to App.js to display in UI
    return response.data.message;
  } catch (error) {
    console.error('Failed to add face:', error);
    // Throw an error so App.js can catch and display it
    throw new Error(error.response?.data?.message || 'Failed to add face due to network or server error.');
  }
};
