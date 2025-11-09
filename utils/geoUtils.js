/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
};

/**
 * Check if two locations are within specified distance (in meters)
 */
const isWithinDistance = (lat1, lon1, lat2, lon2, maxDistanceMeters) => {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance <= maxDistanceMeters;
};

module.exports = {
  calculateDistance,
  isWithinDistance
};
