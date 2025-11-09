import React from 'react';
import './ImagePreview.css';


const ImagePreview = ({ capturedData, onRemove, onRetake }) => {
  const { imageDataUrl, latitude, longitude, capturedAt } = capturedData || {};  // ✅ CHANGED: imagePreview → imageDataUrl

  return (
    <div className="image-preview-container">
      <img 
        src={imageDataUrl}  // ✅ CHANGED: Use imageDataUrl
        alt="Captured preview" 
        className="preview-image" 
      />
      
      <div className="image-info">
        <div className="info-row">
          <span className="info-label">📍 Location</span>
          <span className="info-value">
            {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
          </span>
        </div>
        
        <div className="info-row">
          <span className="info-label">📅 Captured</span>
          <span className="info-value">
            {capturedAt ? new Date(capturedAt).toLocaleString() : 'N/A'}
          </span>
        </div>
        
        <div className="info-badge">
          ✓ GPS Embedded
          <span className="badge-subtitle">Location data is embedded in image</span>
        </div>
      </div>

      <button onClick={onRetake} className="btn-retake">
        🔄 Retake Photo
      </button>
    </div>
  );
}

export default ImagePreview;
