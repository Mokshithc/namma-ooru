import React, { useEffect, useRef, useState,useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminReportsMap.css';

const AdminReportsMap = ({ reports, statusFilter }) => {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const olaMapsInstance = useRef(null);
  const markers = useRef([]);
  const [filteredReports, setFilteredReports] = useState([]);



  
  // Filter reports based on status
  useEffect(() => {
    if (!reports) return;
    
    const validReports = reports.filter(r => r.latitude && r.longitude);
    
    if (!statusFilter) {
      setFilteredReports(validReports);
    } else {
      setFilteredReports(validReports.filter(r => r.status === statusFilter));
    }
  }, [reports, statusFilter]);
  


  
  const addMarkers = useCallback(() => {
   if (!map.current) return;
 
   // Remove existing markers
   markers.current.forEach(marker => marker.remove());
   markers.current = [];
 
   // Add new markers
   filteredReports.forEach((report) => {
     const color = getPriorityColor(report.priority);
     
     // Create marker element
     const el = document.createElement('div');
     el.className = 'custom-marker';
     el.style.backgroundColor = color;
     el.style.width = '24px';
     el.style.height = '24px';
     el.style.borderRadius = '50%';
     el.style.border = '3px solid white';
     el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
     el.style.cursor = 'pointer';
     // 🔥 FIX: Don't use transform - use filter instead
     el.style.transition = 'filter 0.2s ease, box-shadow 0.2s ease';
 
     // Add hover effect WITHOUT transform
     el.addEventListener('mouseenter', () => {
       el.style.filter = 'brightness(1.2) saturate(1.3)';
       el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
       el.style.width = '28px';
       el.style.height = '28px';
       el.style.zIndex = '1000';
     });
     el.addEventListener('mouseleave', () => {
       el.style.filter = 'none';
       el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
       el.style.width = '24px';
       el.style.height = '24px';
       el.style.zIndex = 'auto';
     });
 
     // Create marker
     const marker = new window.OlaMaps.Marker({
       element: el,
       anchor: 'center'
     })
       .setLngLat([parseFloat(report.longitude), parseFloat(report.latitude)])
       .addTo(map.current);
 
     // Create popup
     const popupContent = `
       <div class="report-popup">
         <div class="popup-header">
           <span class="report-id">Report #${report.id}</span>
           <span class="priority-badge priority-${report.priority}">${(report.priority|| 'null').toUpperCase()}</span>
         </div>
         <div class="popup-body">
           <p><strong>Category:</strong> ${report.category.replace('_', ' ').toUpperCase()}</p>
           <p><strong>Status:</strong> ${report.status.replace('_', ' ')}</p>
           <p class="popup-desc">${report.description?.substring(0, 60) || 'No description'}${report.description?.length > 60 ? '...' : ''}</p>
         </div>
         <div class="popup-footer">
           <button class="view-details-btn" data-report-id="${report.id}">View Details →</button>
         </div>
       </div>
     `;
 
     const popup = new window.OlaMaps.Popup({
       offset: 25,
       closeButton: false,
       maxWidth: '300px'
     }).setHTML(popupContent);
 
     marker.setPopup(popup);
 
     // Handle "View Details" button click
     popup.on('open', () => {
       const btn = document.querySelector(`[data-report-id="${report.id}"]`);
       if (btn) {
         btn.onclick = () => navigate(`/admin/reports/${report.id}`);
       }
     });
 
     markers.current.push(marker);
   });
 
   console.log(`✅ Added ${filteredReports.length} markers`);
  },[filteredReports, navigate]);
  // Initialize map



  useEffect(() => {
    if (map.current || !window.OlaMaps || filteredReports.length === 0) return;

    try {
      console.log('🗺️ Initializing Admin Reports Map...');

      // Initialize Ola Maps
      olaMapsInstance.current = new window.OlaMaps({
        apiKey: process.env.REACT_APP_OLA_MAPS_API_KEY,
      });

      // Calculate center point (average of all reports)
      const avgLat = filteredReports.reduce((sum, r) => sum + parseFloat(r.latitude), 0) / filteredReports.length;
      const avgLng = filteredReports.reduce((sum, r) => sum + parseFloat(r.longitude), 0) / filteredReports.length;

      // Render map
      map.current = olaMapsInstance.current.init({
        style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
        container: mapContainer.current,
        center: [avgLng, avgLat],
        zoom: 12,
      });

 

      map.current.on('load', () => {
        addMarkers();
      });

    } catch (error) {
      console.error(' Error initializing map:', error);
    }
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [filteredReports, addMarkers]);

  // Add/update markers when filtered reports change
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    addMarkers();
  }, [filteredReports, addMarkers]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#ef4444'; // Red
      case 'medium':
        return '#f59e0b'; // Orange/Yellow
      case 'low':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };



  return (
    <div className="admin-map-container">
      <div className="map-header">
        <h3>📍 Reports Map</h3>
        <div className="map-stats">
          <span className="report-count">
            {filteredReports.length} {filteredReports.length === 1 ? 'Report' : 'Reports'}
          </span>
        </div>
      </div>

      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
          <span>High Priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Medium Priority</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
          <span>Low Priority</span>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="map-empty-state">
          <p>📍 No reports with location data to display on map</p>
        </div>
      ) : (
        <div ref={mapContainer} className="map-display" />
      )}
    </div>
  );
};

export default AdminReportsMap;
