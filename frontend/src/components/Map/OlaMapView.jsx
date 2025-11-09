import React, { useEffect, useRef } from 'react';
import './OlaMapView.css';

const OlaMapView = ({ latitude, longitude, zoom = 15, height = '350px' }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const olaMapsInstance = useRef(null);

  useEffect(() => {
    // Prevent duplicate initialization
    if (map.current) return;

    if (!window.OlaMaps) {
      console.error('Ola Maps SDK not loaded');
      return;
    }

    try {
      console.log(' Initializing Ola Maps...');

      // Initialize Ola Maps
      olaMapsInstance.current = new window.OlaMaps({
        apiKey: process.env.REACT_APP_OLA_MAPS_API_KEY,
      });

      // Render map
      map.current = olaMapsInstance.current.init({
        style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
        container: mapContainer.current,
        center: [longitude, latitude],
        zoom: zoom,
      });

      console.log(' Map initialized');

      // Add marker using GeoJSON layer (works with all map libraries)
      map.current.on('load', () => {
        // Add marker as a GeoJSON point
        map.current.addSource('report-location', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            properties: {
              title: 'Report Location',
              description: `${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`
            }
          }
        });

        // Add circle layer for the marker
        map.current.addLayer({
          id: 'report-marker-circle',
          type: 'circle',
          source: 'report-location',
          paint: {
            'circle-radius': 12,
            'circle-color': '#667eea',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
          }
        });

        // Add pulsing animation layer
        map.current.addLayer({
          id: 'report-marker-pulse',
          type: 'circle',
          source: 'report-location',
          paint: {
            'circle-radius': 20,
            'circle-color': '#667eea',
            'circle-opacity': 0.3
          }
        });

        // Add popup on click
        map.current.on('click', 'report-marker-circle', () => {
          alert(` Report Location\n\nLatitude: ${latitude.toFixed(6)}°N\nLongitude: ${longitude.toFixed(6)}°E`);
        });

        // Change cursor on hover
        map.current.on('mouseenter', 'report-marker-circle', () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'report-marker-circle', () => {
          map.current.getCanvas().style.cursor = '';
        });

        console.log(' Marker added as GeoJSON layer');
      });

    } catch (error) {
      console.error(' Error:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, zoom]);

  return (
    <div 
      ref={mapContainer} 
      className="ola-map-container"
      style={{ 
        width: '100%', 
        height: height, 
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    />
  );
};

export default OlaMapView;
