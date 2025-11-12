import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; 

import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import OlaMapView from '../Map/OlaMapView';
import './AdminReportDetail.css';

function AdminReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);


  useEffect(() => {
    fetchReportDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/reports/${id}`);
      console.log('Report data:', response.data); // DEBUG
      setReport(response.data);
      setSelectedStatus(response.data.status);
      setError('');
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };




const handleAdminClick = () => {
  
  navigate('/admin');
};

const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStatusUpdate = async () => {
    if (selectedStatus === report.status) {
      alert('Status is already set to this value');
      return;
    }

    try {
      setUpdating(true);
      await api.patch(`/admin/reports/${id}`, { status: selectedStatus });
      alert('Status updated successfully!');
      fetchReportDetails();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admin/reports/${id}`);
      alert('Report deleted successfully');
      navigate('/admin');
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error || !report) {
    return <div className="error">{error || 'Report not found'}</div>;
  }

  return (
    <div className="admin-report-detail">


<div className="header-content">
        <button onClick={handleAdminClick} className="action-btn secondary">
          admin Dashboard
        </button>
        <h1> Namma Ooru</h1>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        
      </div>

      <button onClick={() => navigate('/admin')} className="back-button">
        ← Back
      </button>

      <div className="detail-container">
        {/* LEFT COLUMN */}
        <div className="left-column">
          {/* Image */}
          {report.image_url ? (
            <div className="report-image-container">
              <p>Report Image</p>
              <img 
                src={`${process.env.REACT_APP_BASE_URL}${report.image_url}`}
                alt="Report"
                className="report-image"
                onError={(e) => {
                  console.error('Image failed to load:', report.image_url);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="no-image">No Image Attached</div>
          )}

          {/* Map */}
          <div className="location-card">
            <h3 className="location-title">📍 Location</h3>
            <div className="map-wrapper">
              <OlaMapView
                latitude={report.latitude}
                longitude={report.longitude}
                title={report.category}
              />
            </div>
            <div className="coordinates-box">
              <strong>📍 Coordinates:</strong>
              <p>{report.latitude}°N, {report.longitude}°E</p>
            </div>
            <a
              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="view-maps-btn"
            >
              view in Google Maps
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">
          {/* Category Header */}
          <div className="category-header">
            
            <h1>Report #{report.id}</h1>
            <h1>{report.category.toUpperCase()}</h1>
          </div>

          {/* Description */}
          <div className="info-card">
            <h3>Description</h3>
            <p>{report.description}</p>
          </div>

          {/* Address */}
          <div className="info-card">
            <h3>Address</h3>
            <p>{report.address}</p>
          </div>

          {/* Status Grid */}
          <div className="status-grid-container">
            <div className="status-grid-item">
              <span className="status-grid-label">PRIORITY</span>
              <span className={`badge priority-${report.priority ? report.priority.toLowerCase() : 'null'}`}>
                {report.priority ? report.priority.toUpperCase() : '—'}
              </span>
            </div>

            <div className="status-grid-item">
              <span className="status-grid-label">STATUS</span>
              <span className={`badge status-${report.status}`}>
                {report.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <div className="status-grid-item">
              <span className="status-grid-label">VERIFICATION</span>
              <span className="badge verification-pending">⏳ Pending</span>
            </div>

            <div className="status-grid-item">
              <span className="status-grid-label">SUBMITTED</span>
              <span className="submitted-text">
                {new Date(report.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="status-grid-item" style={{gridColumn: 'span 2'}}>
              <span className="status-grid-label">REPORTER</span>
              <span className="reporter-text">{report.user_name} --  {report.user_email}</span>
            </div>
          </div>

          {/* Update Status */}
          <div className="info-card">
            <h3>Update Status</h3>

            {report.status === 'awaiting_user_confirmation' && (
              <div className="alert alert-warning">
                ⏳ <strong>Awaiting User Confirmation</strong><br />
                Status cannot be changed until user responds.
              </div>
            )}

            {report.status === 'reopened' && report.reopen_count > 0 && (
              <div className="alert alert-error">
                ⚠️ <strong>User Rejected Resolution</strong><br />
                Re-raised {report.reopen_count} time(s).
              </div>
            )}

            <div className="status-update-controls">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={report.status === 'awaiting_user_confirmation'}
                className="status-dropdown"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="reopened">Reopened</option>
              </select>

              <button
                onClick={handleStatusUpdate}
                disabled={
                  updating ||
                  selectedStatus === report.status ||
                  report.status === 'awaiting_user_confirmation'
                }
                className="update-status-btn"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>

            {report.status !== 'awaiting_user_confirmation' && (
              <p className="note-text">
                <strong>Note:</strong> "Resolved" auto-changes to "Awaiting User Confirmation"
              </p>
            )}
          </div>

          {/* Danger Zone */}
        
          { report.status === 'closed' && <div className="danger-card"> 
            <h3> Danger Zone</h3>
            <p>Deleting this report cannot be undone.</p>
            <button onClick={handleDelete} className="danger-btn">Delete Report</button>
          </div>}
        </div>
      </div>
    </div>
  );
}

export default AdminReportDetail;
