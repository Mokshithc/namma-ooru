import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './ReportDetail.css';
import OlaMapView from '../Map/OlaMapView';

// Component to show both captured and user-corrected locations

const DualLocationMap = ({ capturedLat, capturedLng, userLat, userLng, accuracy }) => {
  const mapContainer = React.useRef(null);
  const map = React.useRef(null);

  React.useEffect(() => {
    if (map.current) return;

    if (!window.OlaMaps) {
      console.error('Ola Maps SDK not loaded');
      return;
    }

    try {
      const olaMaps = new window.OlaMaps({
        apiKey: process.env.REACT_APP_OLA_MAPS_API_KEY,
      });

      const centerLat = (capturedLat + userLat) / 2;
      const centerLng = (capturedLng + userLng) / 2;

      map.current = olaMaps.init({
        style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
        container: mapContainer.current,
        center: [centerLng, centerLat],
        zoom: 17,
      });

      map.current.on('load', () => {
        // Blue accuracy circle
        if (accuracy) {
          map.current.addSource('accuracy-circle', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [capturedLng, capturedLat]
              }
            }
          });

          map.current.addLayer({
            id: 'accuracy-fill',
            type: 'circle',
            source: 'accuracy-circle',
            paint: {
              'circle-radius': 12,
              'circle-color': '#2196F3',
              'circle-opacity': 0.2,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#2196F3'
            }
          });
        }

        // Blue marker (captured GPS)
        map.current.addSource('captured-marker', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [capturedLng, capturedLat]
            }
          }
        });

        map.current.addLayer({
          id: 'captured-circle',
          type: 'circle',
          source: 'captured-marker',
          paint: {
            'circle-radius': 10,
            'circle-color': '#2196F3',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Red marker (user verified)
        map.current.addSource('user-marker', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [userLng, userLat]
            }
          }
        });


        map.current.addLayer({
          id: 'user-circle',
          type: 'circle',
          source: 'user-marker',
          paint: {
            'circle-radius': 10,
            'circle-color': '#ff4444',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Fit bounds
        const bounds = [
          [Math.min(capturedLng, userLng), Math.min(capturedLat, userLat)],
          [Math.max(capturedLng, userLng), Math.max(capturedLat, userLat)]
        ];
        map.current.fitBounds(bounds, { padding: 60 });
      });

    } catch (error) {
      console.error('Dual map error:', error);
    }

    return () => {
      if (map.current) map.current.remove();
    };
  }, [capturedLat, capturedLng, userLat, userLng, accuracy]);

  return (
    <div 
      ref={mapContainer}
      style={{ 
        width: '100%', 
        height: '350px', 
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#f0f0f0'
      }}
    />
  );
};

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userReportCount, setUserReportCount] = useState(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
const [confirmAction, setConfirmAction] = useState(null); // 'accept' or 'reject'
const [rejectionReason, setRejectionReason] = useState('');
const [processing, setProcessing] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/${id}`);
      setReport(response.data.report);
      
      // Fetch user's total reports
      // if (response.data.report.user_id) {
      //   const userReportsResponse = await api.get(`/reports?user_id=${response.data.report.user_id}`);
      //   setUserReportCount(userReportsResponse.data.reports.length);
      // }

      // Fetch user's total reports
if (response.data.report.userid) {
  const userReportsResponse = await api.get('/reports');
  setUserReportCount(userReportsResponse.data.reports.length);
}

      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report');
      setLoading(false);
    }
  }, [id]);


// Handler to accept resolution
const handleAcceptResolution = async () => {
  try {
    setProcessing(true);
    await api.put(`/reports/${id}/accept-resolution`);
    alert('✅ Resolution accepted! Report is now closed.');
    fetchReport(); // Refresh to show updated status
    setProcessing(false);
  } catch (err) {
    console.error('Error accepting resolution:', err);
    alert('Failed to accept resolution. Please try again.');
    setProcessing(false);
  }
};

const ConfirmationDialog = () => {
  if (!showConfirmDialog) return null;

  return (
    <div className="confirmation-overlay">
      <div className="confirmation-dialog">
        {confirmAction === 'accept' ? (
          <>
            <h3>✅ Accept Resolution?</h3>
            <p>Are you sure the issue has been resolved to your satisfaction?</p>
            <p><strong>This action will close the report permanently.</strong></p>
            <div className="dialog-actions">
              <button 
                onClick={() => setShowConfirmDialog(false)} 
                className="btn-secondary"
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                onClick={handleAcceptResolution} 
                className="btn-primary"
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Yes, Accept'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>⚠️ Reject Resolution?</h3>
            <p>Please explain why the issue is NOT resolved:</p>
            <textarea
            key ="rejection-textarea"
  value={rejectionReason}
  onChange={(e) => setRejectionReason(e.target.value)}
  placeholder="Explain what still needs to be fixed..."
  rows="4"
  style={{
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    fontSize: '14px',
  }}
/>

            <p className="escalation-note">
              <strong>Note:</strong> Rejecting will re-raise the complaint with increased priority.
            </p>
            <div className="dialog-actions">
              <button 
                onClick={() => {
                  setShowConfirmDialog(false);
                  setRejectionReason('');
                }} 
                className="btn-secondary"
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectResolution} 
                className="btn-danger"
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Processing...' : 'Reject & Re-raise'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// Handler to reject resolution
const handleRejectResolution = async () => {
  if (!rejectionReason.trim()) {
    alert('Please provide a reason for rejecting the resolution.');
    return;
  }

  try {
    setProcessing(true);
    await api.put(`/reports/${id}/reject-resolution`, {
      reason: rejectionReason
    });
    alert('⚠️ Resolution rejected. Report has been re-raised with higher priority.');
    setRejectionReason('');
    setShowConfirmDialog(false);
    fetchReport(); // Refresh to show updated status
    setProcessing(false);
  } catch (err) {
    console.error('Error rejecting resolution:', err);
    alert('Failed to reject resolution. Please try again.');
    setProcessing(false);
  }
};



  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#ff9800';
      case 'in_progress': return '#2196F3';
      case 'resolved': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.7) return '#4CAF50';
    if (score >= 0.4) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <div className="report-detail-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-detail-container">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back to Dashboard
        </button>
        <div className="error-state">
          <h2>😕 {error || 'Report not found'}</h2>
          <p>The report you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }


// Confirmation Dialog Component


  return (
    <div className="report-detail-container">
      {/* Header */}
  
  <button onClick={() => navigate('/dashboard')} className="back-button">
    ← Back to Dashboard
  </button>
      {/* Main Content */}
      <div className="detail-content">
        {/* Left Column - Image & Map */}
        <div className="detail-left">
          {/* Image Section */}
          <div className="image-section">
            {report.image_url ? (
              <>
                <img 
                  src={`http://localhost:3000${report.image_url}`} 
                  alt={report.category}
                  className="report-image-large"
                />
                <div className="image-overlay">
                  <span className="confidence-badge" style={{ 
                    backgroundColor: getConfidenceColor(report.confidence_score) 
                  }}>
                    {(report.confidence_score * 100).toFixed(0)}% Confidence
                  </span>
                </div>
              </>
            ) : (
              <div className="no-image-placeholder">
                <span></span>
                <p>No Image</p>
              </div>
            )}
          </div>

          {/* Map Section */}
          <div className="map-section">
            <h3>📍 Location</h3>
            
            {report.location_corrected && report.captured_latitude && report.user_latitude ? (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '20px',
                  padding: '10px',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '13px'
                }}>
                  <div>
                    <span style={{ 
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      background: '#2196F3',
                      borderRadius: '50%',
                      marginRight: '6px'
                    }}></span>
                    Captured GPS
                  </div>
                  <div>
                    <span style={{ 
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      background: '#ff4444',
                      borderRadius: '50%',
                      marginRight: '6px'
                    }}></span>
                    User Verified
                  </div>
                </div>

                <DualLocationMap
                  capturedLat={report.captured_latitude}
                  capturedLng={report.captured_longitude}
                  userLat={report.user_latitude}
                  userLng={report.user_longitude}
                  accuracy={report.captured_accuracy}
                />
              </>
            ) : (
              <OlaMapView 
                latitude={report.latitude} 
                longitude={report.longitude} 
                zoom={16}
                height="300px"
              />
            )}
            
            {/* Coordinates Info */}
            <div className="coordinates" style={{
              marginTop: '15px',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              {report.location_corrected && report.captured_latitude ? (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: '500', fontSize: '13px' }}>
                      <span style={{ color: '#2196F3' }}>📷 Captured GPS:</span>
                    </p>
                    <p style={{ margin: '0', color: '#555', fontSize: '12px' }}>
                      {report.captured_latitude.toFixed(6)}°N, {report.captured_longitude.toFixed(6)}°E
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: '500', fontSize: '13px' }}>
                      <span style={{ color: '#ff4444' }}>📍 User Verified:</span>
                    </p>
                    <p style={{ margin: '0', color: '#555', fontSize: '12px' }}>
                      {report.user_latitude.toFixed(6)}°N, {report.user_longitude.toFixed(6)}°E
                    </p>
                  </div>

                  {report.location_distance_m > 0 && (
                    <div style={{ 
                      padding: '8px', 
                      background: '#e3f2fd', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#1976d2',
                      marginTop: '8px'
                    }}>
                      <strong>📏 Distance:</strong> {Math.round(report.location_distance_m)}m apart
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '500', fontSize: '13px' }}>
                    <strong>📍 Coordinates:</strong>
                  </p>
                  <p style={{ margin: '0', color: '#555', fontSize: '12px' }}>
                    {report.latitude.toFixed(6)}°N, {report.longitude.toFixed(6)}°E
                  </p>
                </>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <a 
                  href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 12px',
                    background: '#4285f4',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  view in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="detail-right">
         <div className="category-badge">
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
    <span className="category-icon">
      {report.category === 'pothole' && '🕳️'}
      {report.category === 'garbage' && '🗑️'}
      {report.category === 'street_light' && '💡'}
      {report.category === 'water_leak' && '💧'}
      {report.category === 'drainage' && '🚰'}
      {report.category === 'road_damage' && '🛣️'}
      {report.category === 'illegal_parking' && '🚗'}
      {!['pothole', 'garbage', 'street_light', 'water_leak', 'drainage', 'road_damage', 'illegal_parking'].includes(report.category) && '📝'}
    </span>
    <h1>{report.category.replace(/_/g, ' ').toUpperCase()}</h1>
  </div>
  
  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
    {userReportCount && (
      <span className="report-count-inline">Report #{userReportCount}</span>
    )}
    
  </div>
</div>


          {/* Report Details */}
          <div className="report-details">
            <div className="info-section">
              <h3>Description</h3>
              <p className="description">{report.description}</p>
            </div>

            <div className="info-section">
              <h3> Address</h3>
              <p>{report.address || report.location_address || 'Not provided'}</p>
            </div>

            <div className="info-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '15px',
              marginTop: '20px'
            }}>
              <div className="info-card">
                <span className="info-label">Priority</span>
                <span className="info-value" style={{
                  color: report.priority === 'high' ? '#f44336' : report.priority === 'medium' ? '#ff9800' : '#4CAF50'
                }}>
                  {(report.priority || 'Medium').toUpperCase()}
                </span>
              </div>

              <div className="info-card">
                <span className="info-label">Status</span>
                <span className="info-value" style={{ color: getStatusColor(report.status) }}>
                  {report.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="info-card">
                <span className="info-label">Verification</span>
                <span className="info-value">
                  {report.verification_status === 'verified' ? '✅ Verified' : '⏳ Pending'}
                </span>
              </div>

              <div className="info-card">
                <span className="info-label">Submitted</span>
                <span className="info-value">
                  {new Date(report.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              
            </div>


 {/* User Approval Section - Only show if awaiting confirmation */}
              {report.status === 'awaiting_user_confirmation' && (
                <div className="approval-section">
                  <div className="approval-header">
                    <h2>⏳ Admin Response: Awaiting Your Confirmation</h2>
                    <p>The admin has marked this issue as resolved. Please confirm if the problem has been fixed.</p>
                  </div>

                  <div className="approval-actions">
                    <button 
                      className="btn-accept"
                      onClick={() => {
                        setConfirmAction('accept');
                        setShowConfirmDialog(true);
                      }}
                    >
                      ✅ Yes, Issue is Fixed
                    </button>

                    <button 
                      className="btn-reject"
                      onClick={() => {
                        setConfirmAction('reject');
                        setShowConfirmDialog(true);
                      }}
                    >
                      ⚠️ No, Issue Persists
                    </button>
                  </div>

                  <p className="approval-note">
                    <strong>Important:</strong> If you reject, the complaint will be re-raised with higher priority.
                  </p>
                </div>
              )}

              {/* Show rejection history if reopened */}
              {report.status === 'reopened' && report.reopen_count > 0 && (
                <div className="reopened-notice">
                  <p>🔄 <strong>This report was re-raised {report.reopen_count} time(s)</strong> because the issue was not resolved.</p>
                </div>
              )}

             


          </div>
        </div>
      </div>
      <ConfirmationDialog />
    </div>
  );
};

export default ReportDetail;


//adding confdiag remd eslint? fr func????
