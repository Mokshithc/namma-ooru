import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { getCurrentLocation } from '../../utils/gpsHelper';

import './CameraCapture.css';

const CameraCapture = ({ onImageCaptured, onCancel }) => {
  const webcamRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'

  // Get device info on mount


  // Get GPS location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
      } catch (error) {
        console.error('Location error:', error);
        setLocationError(error.message);
      }
    };

    getLocation();
  }, []);

  // Capture image with embedded GPS
  const captureImage = useCallback(async () => {
    if (!webcamRef.current) {
      alert('Camera not ready');
      return;
    }

    if (!location) {
      alert('Waiting for GPS location... Please try again.');
      return;
    }

    setIsCapturing(true);

    try {
      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot();

      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }

      const response = await fetch(imageSrc);
const blob = await response.blob();
const imageFile = new File([blob], `report_${Date.now()}.jpg`, {
  type: 'image/jpeg',
});

   
   
const captureData = {
  imageFile,          // ✅ For backend upload
  imageDataUrl: imageSrc,  // ✅ For frontend preview
  latitude: location.latitude,
  longitude: location.longitude,
  accuracy: location.accuracy,
  altitude: location.altitude,
  capturedAt: new Date().toISOString(),
};

      onImageCaptured(captureData);
    } catch (error) {
      console.error('Capture error:', error);
      alert('Failed to capture image: ' + error.message);
    } finally {
      setIsCapturing(false);
    }
  }, [location,  onImageCaptured]);

  // Toggle camera (front/back)
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Video constraints
  const videoConstraints = {
    facingMode: facingMode,
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };

  return (
    <div className="camera-capture">
      <div className="camera-header">
        <h3>📷 Capture Report Image</h3>
        <button className="btn-close" onClick={onCancel}>
          ✕
        </button>
      </div>

      {/* GPS Status */}
      {/* GPS Status */}
<div className="gps-status">
  {location ? (
    <div className="status-success">
      <span className="icon">✓</span>
      <div>
        <strong>GPS Lock Acquired</strong>
        <br />
        <small>
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          <br />
          Accuracy: ±{Math.round(location.accuracy)}m
          {location.accuracy > 100 && (
            <span style={{color: '#ff9800'}}> (Low accuracy)</span>
          )}
        </small>
      </div>
    </div>
  ) : locationError ? (
    <div className="status-error">
      <span className="icon">✗</span>
      <div>
        <strong>GPS Error</strong>
        <br />
        <small style={{whiteSpace: 'pre-line'}}>{locationError}</small>
        <br />
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: '10px',
            padding: '5px 10px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    </div>
  ) : (
    <div className="status-loading">
      <span className="icon spinning">⟳</span>
      <div>
        <strong>Acquiring GPS Signal...</strong>
        <br />
        <small>
           Go outside or near a window for faster GPS lock
        </small>
      </div>
    </div>
  )}
</div>


      {/* Camera Preview */}
      <div className="camera-preview">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className="webcam"
        />
        
        {/* Camera overlay */}
        <div className="camera-overlay">
          <div className="crosshair"></div>
        </div>
      </div>





      {/* Controls */}
      <div className="camera-controls">
        <button
          className="btn-secondary"
          onClick={toggleCamera}
          disabled={isCapturing}
        >
          🔄 Flip
        </button>

        <button
          className="btn-capture"
          onClick={captureImage}
          disabled={!location || isCapturing}
        >
          {isCapturing ? (
            <>
              <span className="spinner"></span> Processing...
            </>
          ) : (
            <> Capture</>
          )}
        </button>

        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {/* Info */}
      <div className="camera-info">
        <p>
          <small>
            Image will be captured along with GPS coordinates.
            <br />
            Make sure location permissions are enabled.
          </small>
        </p>
      </div>
    </div>
  );
};

export default CameraCapture;
