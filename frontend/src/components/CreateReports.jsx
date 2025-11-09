import React, { useState } from 'react';
import CameraCapture from './CameraCapture';

const CreateReport = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedData, setCapturedData] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle image capture from camera
  const handleImageCaptured = (data) => {
    console.log('Image captured with metadata:', data);
    setCapturedData(data);
    setShowCamera(false);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Submit report to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!capturedData) {
      alert('Please capture an image first');
      return;
    }

    if (!formData.category || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare FormData for multipart upload
      const submitData = new FormData();
      submitData.append('image', capturedData.imageFile);
      submitData.append('category', formData.category);
      submitData.append('description', formData.description);
      submitData.append('address', formData.address);
      submitData.append('latitude', capturedData.latitude);
      submitData.append('longitude', capturedData.longitude);
      submitData.append('captured_at', capturedData.capturedAt);
      submitData.append('device_info', JSON.stringify(capturedData.deviceInfo));
      submitData.append('exif_data', JSON.stringify(capturedData.exifData));

      // Get auth token from localStorage or context
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit report');
      }

      const result = await response.json();
      console.log('Report submitted successfully:', result);
      
      alert('Report submitted successfully!');
      
      // Reset form
      setFormData({ category: '', description: '', address: '' });
      setCapturedData(null);

    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-report-container" style={styles.container}>
      <h2>Create New Report</h2>

      {showCamera ? (
        <CameraCapture
          onImageCaptured={handleImageCaptured}
          onCancel={() => setShowCamera(false)}
        />
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Image capture button */}
          <div style={styles.formGroup}>
            <label>Report Image *</label>
            {capturedData ? (
              <div style={styles.imagePreview}>
                <img 
                  src={capturedData.imagePreview} 
                  alt="Captured" 
                  style={styles.previewImage}
                />
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  style={styles.retakeButton}
                >
                  📷 Retake Photo
                </button>
                <div style={styles.metadataInfo}>
                  <small>
                    📍 Location: {capturedData.latitude.toFixed(6)}, {capturedData.longitude.toFixed(6)}<br />
                    🕒 Captured: {new Date(capturedData.capturedAt).toLocaleString()}<br />
                    ✓ GPS Embedded in Image
                  </small>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                style={styles.captureButton}
              >
                📷 Capture Image with GPS
              </button>
            )}
          </div>

          {/* Category dropdown */}
          <div style={styles.formGroup}>
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              style={styles.input}
            >
              <option value="">Select a category</option>
              <option value="pothole">Pothole</option>
              <option value="street_light">Street Light</option>
              <option value="garbage">Garbage/Waste</option>
              <option value="drainage">Drainage Issue</option>
              <option value="road_damage">Road Damage</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description textarea */}
          <div style={styles.formGroup}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="4"
              placeholder="Describe the issue in detail..."
              style={styles.textarea}
            />
          </div>

          {/* Address input */}
          <div style={styles.formGroup}>
            <label htmlFor="address">Address (Optional)</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Street address or landmark"
              style={styles.input}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !capturedData}
            style={{
              ...styles.submitButton,
              ...(isSubmitting || !capturedData) && styles.submitButtonDisabled
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      )}
    </div>
  );
};

// Inline styles
const styles = {
  container: {
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  textarea: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  captureButton: {
    padding: '40px',
    fontSize: '18px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: '2px dashed #0056b3',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  imagePreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  previewImage: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  retakeButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  metadataInfo: {
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    color: '#495057'
  },
  submitButton: {
    padding: '15px',
    fontSize: '18px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '10px'
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
};

export default CreateReport;
