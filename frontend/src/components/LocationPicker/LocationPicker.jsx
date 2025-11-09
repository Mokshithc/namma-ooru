import React, { useEffect, useRef, useState, useCallback } from 'react';
import './LocationPicker.css';

const LocationPicker = ({ initialLat, initialLng, onLocationChange, accuracy = null }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const olaMapsInstance = useRef(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: initialLat, lng: initialLng });

  // Store FIXED captured position (never changes)
  const capturedPosition = useRef({ lat: initialLat, lng: initialLng });

  // FIXED black GPS marker - NEVER MOVES
  const addFixedGPSMarker = useCallback((lat, lng) => {
    if (!map.current) return;
    if (map.current.getSource('gps-marker')) return; // prevent duplicate

    map.current.addSource('gps-marker', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }
    });

    map.current.addLayer({
      id: 'gps-marker-circle',
      type: 'circle',
      source: 'gps-marker',
      paint: {
        'circle-radius': 8,
        'circle-color': '#000000',
        'circle-opacity': 1,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
  }, []);

  // Accuracy circle - shows GPS precision range (fixed at captured position)
  const addAccuracyCircle = useCallback((lat, lng, accuracyMeters) => {
    if (!map.current) return;
    if (map.current.getSource('accuracy-circle')) return; // prevent duplicate

    const radiusInPixels = Math.max(20, accuracyMeters / 2.4);

    map.current.addSource('accuracy-circle', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }
    });

    map.current.addLayer({
      id: 'accuracy-fill',
      type: 'circle',
      source: 'accuracy-circle',
      paint: {
        'circle-radius': radiusInPixels,
        'circle-color': '#808080',
        'circle-opacity': 0.15,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#606060',
        'circle-stroke-opacity': 0.4
      }
    });
  }, []);

  // Draggable RED marker - user can move
  const addDraggableMarker = useCallback((lat, lng) => {
    if (!map.current) return;

    if (!map.current.getSource('draggable-marker')) {
      map.current.addSource('draggable-marker', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }
      });

      map.current.addLayer({
        id: 'marker-circle',
        type: 'circle',
        source: 'draggable-marker',
        paint: {
          'circle-radius': 12,
          'circle-color': '#ff4444',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

      // Click anywhere to move the red marker
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        const src = map.current.getSource('draggable-marker');
        if (src) {
          src.setData({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] }
          });
        }
        setCurrentLocation({ lat, lng });
        if (onLocationChange) onLocationChange(lat, lng);
        map.current.easeTo({ center: [lng, lat], duration: 500 });
      });

      map.current.on('mouseenter', 'marker-circle', () => {
        map.current.getCanvas().style.cursor = 'move';
      });
      map.current.on('mouseleave', 'marker-circle', () => {
        map.current.getCanvas().style.cursor = '';
      });
    } else {
      // Initial center update if source exists
      const src = map.current.getSource('draggable-marker');
      src.setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] }
      });
    }
  }, [onLocationChange]);

  useEffect(() => {
  if (map.current) return; // Already initialized - STOP

  if (!window.OlaMaps) {
    console.error('Ola Maps SDK not loaded');
    return;
  }

  try {
    olaMapsInstance.current = new window.OlaMaps({
      apiKey: process.env.REACT_APP_OLA_MAPS_API_KEY,
    });

    map.current = olaMapsInstance.current.init({
      style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
      container: mapContainer.current,
      center: [initialLng, initialLat],
      zoom: 17,
    });

    map.current.on('load', () => {
      // 1) Fixed black GPS marker (bottom layer)
      addFixedGPSMarker(capturedPosition.current.lat, capturedPosition.current.lng);

      // 2) Accuracy circle (middle layer)
      if (accuracy && accuracy > 0) {
        addAccuracyCircle(capturedPosition.current.lat, capturedPosition.current.lng, accuracy);
      }

      // 3) Draggable red marker (top layer)
      addDraggableMarker(initialLat, initialLng);
    });

    console.log('✅ Map initialized');
  } catch (error) {
    console.error('Map initialization error:', error);
  }

  return () => {
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
  };
  // EMPTY dependency array - initialize ONLY ONCE
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  return (
    <div className="location-picker">
      <div ref={mapContainer} className="location-picker-map" style={{ width: '100%', height: '400px' }} />
      <div className="location-picker-info">
        <p>
          <strong>⚫ Black marker:</strong> GPS captured (Fixed: {capturedPosition.current.lat.toFixed(5)}, {capturedPosition.current.lng.toFixed(5)})
        </p>
        <p>
          <strong>🔴 Red Marker:</strong> Your corrected location (Current: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)})
        </p>
        {/* {accuracy && (
          <p>
            <strong>Accuracy:</strong> ±{Math.round(accuracy)} meters (gray circle)
          </p>
        )} */}
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
          Click anywhere on the map to move the red marker to the exact issue location
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;

