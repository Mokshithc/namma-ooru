/**
 * GPS Helper - Fast Accept Version
 * Always returns GPS within 15 seconds, never rejects
 */

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    console.log('🛰️ Getting GPS location...');
    
    let firstPosition = null;
    let bestPosition = null;
    let bestAccuracy = Infinity;
    let attempts = 0;
    
    
    const QUICK_TIMEOUT = 15000; // 15 seconds - guarantee result
    const maxAttempts = 5;
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++;
        const accuracy = Math.round(position.coords.accuracy);
        
        console.log(`📍 GPS #${attempts}: ±${accuracy}m`);
        
        // Save first reading immediately (fallback)
        if (!firstPosition) {
          firstPosition = position;
          console.log(`💾 Saved first reading as backup (±${accuracy}m)`);
        }
        
        // Track best accuracy
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          bestPosition = position;
          console.log(`⭐ New best: ±${accuracy}m`);
        }
        
        // Stop early if got excellent accuracy
        if (accuracy <= 30) {
          navigator.geolocation.clearWatch(watchId);
          console.log(`✅ Excellent accuracy! Using (±${accuracy}m)`);
          resolve(createGPSData(position));
          return;
        }
        
        // Stop if reached max attempts
        if (attempts >= maxAttempts) {
          navigator.geolocation.clearWatch(watchId);
          console.log(`✅ Max attempts. Using best (±${bestAccuracy}m)`);
          resolve(createGPSData(bestPosition));
        }
      },
      (error) => {
        console.error('❌ GPS Error:', error.message);
        
        // Don't reject immediately - might have saved position
        if (firstPosition || bestPosition) {
          const usePosition = bestPosition || firstPosition;
          console.log(`⚠️ Error but have backup (±${Math.round(usePosition.coords.accuracy)}m)`);
          resolve(createGPSData(usePosition));
        } else {
          reject(new Error('GPS failed: ' + error.message));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // 20s per reading
        maximumAge: 0
      }
    );
    
    // GUARANTEED 15-SECOND RETURN - NEVER WAIT LONGER
    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      
      const usePosition = bestPosition || firstPosition;
      
      if (usePosition) {
        const finalAccuracy = Math.round(usePosition.coords.accuracy);
        console.log(`⏱️ 15s timeout: Using ${bestPosition ? 'best' : 'first'} reading (±${finalAccuracy}m)`);
        
        if (finalAccuracy > 200) {
          console.warn(`⚠️ Low accuracy (±${finalAccuracy}m) - user can correct on map`);
        }
        
        resolve(createGPSData(usePosition));
      } else {
        // Only reject if truly no GPS at all after 15 seconds
        reject(new Error('No GPS signal after 15 seconds'));
      }
    }, QUICK_TIMEOUT);
  });
};

// Helper to format GPS data
const createGPSData = (position) => {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude || null,
    altitudeAccuracy: position.coords.altitudeAccuracy || null,
    heading: position.coords.heading || null,
    speed: position.coords.speed || null,
    timestamp: position.timestamp
  };
};

export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    timestamp: new Date().toISOString()
  };
};

export const watchLocation = (onUpdate, onError) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation not supported'));
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp
      });
    },
    (error) => {
      onError(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 5000
    }
  );

  return watchId;
};

export const stopWatchingLocation = (watchId) => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
};
