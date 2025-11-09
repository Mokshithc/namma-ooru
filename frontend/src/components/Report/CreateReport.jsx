import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CameraCapture from '../Camera/CameraCapture';
import ImagePreview from './ImagePreview';
import { reportAPI } from '../../services/api';
import './CreateReport.css';
import LocationPicker from '../LocationPicker/LocationPicker';

const CATEGORIES = [
  { value: 'garbage', label: '🗑️ Garbage/Waste', icon: '🗑️' },
  { value: 'road_damage', label: '🛣️ Road Damage', icon: '🛣️' },
  { value: 'other', label: ' Other Issue', icon: '' },
];

const CreateReport = ({ onSuccess }) => {
  const navigate = useNavigate(); 
  const { logout } = useAuth();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedData, setCapturedData] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
const [userCorrectedLocation, setUserCorrectedLocation] = useState(null);
const [locationPickerKey, setLocationPickerKey] = useState(0); 

  // Handle image capture from camera
// Handle image capture from camera
const handleImageCaptured = (data) => {
  console.log('Image captured:', data);
  setCapturedData(data);
  setShowCamera(false);
  setShowLocationPicker(true); // NEW: Show map for location verification
  setUserCorrectedLocation({
    latitude: data.latitude,
    longitude: data.longitude
  }); // Initialize with captured GPS
  setErrors({ ...errors, image: null });
};

const handleLogout = () => {
  logout();
  navigate('/login');
};

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for this field
    setErrors({ ...errors, [name]: null });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!capturedData) {
      newErrors.image = 'Please capture an image first';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.description || formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


// Calculate distance between two GPS points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};



  // Submit report
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare FormData
      // Prepare FormData
const submitData = new FormData();
submitData.append('image', capturedData.imageFile);
submitData.append('category', formData.category);
submitData.append('description', formData.description.trim());
submitData.append('address', formData.address.trim());

// NEW: Captured GPS (device location)


// NEW: User-corrected GPS (map location)
if (userCorrectedLocation) {
  submitData.append('user_latitude', userCorrectedLocation.latitude);
  submitData.append('user_longitude', userCorrectedLocation.longitude);
  
  // Check if user actually moved the marker
  const distance = calculateDistance(
    capturedData.latitude,
    capturedData.longitude,
    userCorrectedLocation.latitude,
    userCorrectedLocation.longitude
  );
  
  submitData.append('location_distance_m', distance);
  submitData.append('location_corrected', distance > 150 ? 'true' : 'false'); // >5m = corrected
}


      const response = await reportAPI.createReport(submitData);

      console.log('Report submitted:', response.data);

      // Success!
      alert('Report submitted successfully! ');
      
      // Reset form
      setFormData({ category: '', description: '', address: '' });
      setCapturedData(null);
      
      // Call success callback
      if (onSuccess) {
        onSuccess(response.data.report);
      }

    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit report';
      setSubmitError(errorMessage);
      alert('Error: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove captured image
// Remove captured image
const handleRemoveImage = () => {
  setCapturedData(null);
  setShowLocationPicker(false);
  setUserCorrectedLocation(null);
  setLocationPickerKey(0); // Reset key
};



  if (showCamera) {
    return (
      <CameraCapture
        onImageCaptured={handleImageCaptured}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

  return (





  <div className="create-report-container">
    {/* Header with Dashboard + Logout */}
    <div className="create-report-header">
  <button 
    onClick={() => navigate('/dashboard')}
    className="btn-dashboard"
    type="button"
  >
    ← Dashboard
  </button>
  
  <header className="dashboard-header">
        <h1> Namma Ooru</h1>
    </header>

  <button 
    onClick={handleLogout}
    className="btn-logout"
    type="button"
  >
    Logout
  </button>
</div>


    <form onSubmit={handleSubmit} className="create-report-form">
      {/* Form Header - NOW CENTERED */}
      <div className="form-header">
        <h1>Create New Report</h1>
        <p className="subtitle">Help make your neighborhood better by reporting civic issues</p>
      </div>

      <div className="report-form">
        {/* Image Capture Section */}
        <div className="form-section">
          <label className="section-label">Report Image </label>
          {capturedData ? (
            <ImagePreview
              capturedData={capturedData}
              onRemove={handleRemoveImage}
              onRetake={() => setShowCamera(true)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="btn-capture-image"
            >
              <span className="camera-icon"></span>
              <span className="capture-text">Capture Image with GPS</span>
              <span className="capture-hint">Image will be embedded with location data</span>
            </button>
          )}
          {errors.image && (
            <div className="error-message">{errors.image}</div>
          )}
        </div>

        {/* Location Picker Section */}
        {showLocationPicker && capturedData && (
          <div className="form-section">
            <label className="section-label">Verify Location</label>
            <p className="field-hint">Drag the red marker to the exact location of the issue</p>
            
            <LocationPicker
              key={locationPickerKey}
              initialLat={userCorrectedLocation?.latitude || capturedData.latitude}
              initialLng={userCorrectedLocation?.longitude || capturedData.longitude}
              accuracy={capturedData.accuracy}
              onLocationChange={(lat, lng) => {
                setUserCorrectedLocation({ latitude: lat, longitude: lng });
              }}
            />
            
            {/* <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              <strong>Captured:</strong> {capturedData.latitude.toFixed(5)}, {capturedData.longitude.toFixed(5)}
              {userCorrectedLocation && (
                <div>
                  <strong>Your Location:</strong> {userCorrectedLocation.latitude.toFixed(5)}, {userCorrectedLocation.longitude.toFixed(5)}
                </div>
              )}
            </div> */}
            
            {userCorrectedLocation && (
              <button
                type="button"
                onClick={() => {
                  setUserCorrectedLocation({
                    latitude: capturedData.latitude,
                    longitude: capturedData.longitude
                  });
                  setLocationPickerKey(prev => prev + 1);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginTop: '8px',
                  position: 'center'
                }}
              >
                🔄 Reset marker to Captured Location
              </button>
            )}
          </div>
        )}

        {/* Category Selection */}
        <div className="form-section">
          <label className="section-label">Category </label>
          <div className="category-grid">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.value}
                className={`category-card ${formData.category === cat.value ? 'active' : ''}`}
                onClick={() =>
                  handleInputChange({
                    target: { name: 'category', value: cat.value },
                  })
                }
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-label">{cat.label.replace(cat.icon + ' ', '')}</span>
              </div>
            ))}
          </div>
          {errors.category && (
            <div className="error-message">{errors.category}</div>
          )}
        </div>

        {/* Description */}
        <div className="form-section">
          <label className="section-label">Description </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the issue in detail..."
            className={`form-textarea ${errors.description ? 'error' : ''}`}
            rows="5"
          />
          <div className="char-count">{formData.description.length} characters</div>
          {errors.description && (
            <div className="error-message">{errors.description}</div>
          )}
        </div>

        {/* Address (Optional) */}
        <div className="form-section">
          <label className="section-label">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="precise address with pin code"
            className="form-input"
          />
          <span className="field-hint">
            GPS coordinates are automatically captured. Add landmark for better identification.
          </span>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="submit-error">
            <span className="error-icon">⚠️</span>
            {submitError}
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className="btn-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Submitting Report...
            </>
          ) : (
            <>
              ✓ Submit Report
            </>
          )}
        </button>

        {/* Info */}
        <p className="submit-info">
          By submitting, you agree that the information is accurate and will be
          forwaded for further action.
        </p>
      </div>
    </form>
  </div>
);

};

export default CreateReport;
