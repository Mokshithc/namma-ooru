const axios = require('axios');

const OLA_API_KEY = process.env.OLA_MAPS_API_KEY;
const OLA_BASE_URL = process.env.OLA_MAPS_BASE_URL;

/**
 * Reverse geocode using Ola Maps API
 * Get address from coordinates
 */
const reverseGeocode = async (latitude, longitude, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      // Add delay for retries
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const response = await axios.get(`${OLA_BASE_URL}/reverse-geocode`, {
        params: {
          latlng: `${latitude},${longitude}`,
          api_key: OLA_API_KEY
        },
        headers: {
          'X-Request-Id': `namma-ooru-${Date.now()}`
        },
        timeout: 5000
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0];
        
        // Parse address components
        const addressComponents = location.address_components || [];
        const getComponent = (type) => {
          const comp = addressComponents.find(c => c.types && c.types.includes(type));
          return comp ? comp.long_name : '';
        };

        return {
          formattedAddress: location.formatted_address || 'Address not found',
          street: getComponent('route') || getComponent('street_address') || '',
          city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
          state: getComponent('administrative_area_level_1') || '',
          country: getComponent('country') || 'India',
          postalCode: getComponent('postal_code') || '',
          neighborhood: getComponent('sublocality') || getComponent('neighborhood') || '',
          place_id: location.place_id || '',
          geometry: location.geometry || {},
          raw: location
        };
      }

      // If no results
      return getFallbackAddress(latitude, longitude);

    } catch (error) {
      console.error(`Ola Maps geocoding attempt ${i + 1} failed:`, error.message);
      
      if (i === retries) {
        // All retries failed
        return getFallbackAddress(latitude, longitude, error.message);
      }
    }
  }
};

/**
 * Fallback address when API fails
 */
const getFallbackAddress = (latitude, longitude, errorMsg = 'Geocoding unavailable') => {
  return {
    formattedAddress: `Location: ${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E`,
    street: 'Unknown',
    city: 'Bengaluru', // Default city
    state: 'Karnataka',
    country: 'India',
    postalCode: '',
    neighborhood: '',
    error: errorMsg,
    isFallback: true
  };
};

/**
 * Validate if provided address matches geocoded address
 */
const validateAddressMatch = (providedAddress, geocodedAddress) => {
  if (!providedAddress || providedAddress.trim() === '') {
    return {
      matches: true,
      confidence: 0.5,
      reason: 'No address provided',
      geocodedAddress: geocodedAddress?.formattedAddress || 'Unknown'
    };
  }

  if (!geocodedAddress || geocodedAddress.error || geocodedAddress.isFallback) {
    return {
      matches: true, // Don't penalize for API failure
      confidence: 0.5,
      reason: 'Geocoding unavailable',
      geocodedAddress: geocodedAddress?.formattedAddress || 'Unknown'
    };
  }

  const provided = providedAddress.toLowerCase().trim();
  const geocoded = (geocodedAddress.formattedAddress || '').toLowerCase();

  // Extract key components
  const cityMatch = geocodedAddress.city && 
    (provided.includes(geocodedAddress.city.toLowerCase()) || 
     geocoded.includes(provided));
  
  const stateMatch = geocodedAddress.state && 
    provided.includes(geocodedAddress.state.toLowerCase());
  
  const streetMatch = geocodedAddress.street && 
    provided.includes(geocodedAddress.street.toLowerCase());
  
  const neighborhoodMatch = geocodedAddress.neighborhood && 
    provided.includes(geocodedAddress.neighborhood.toLowerCase());

  // Calculate match score
  let matchScore = 0;
  if (streetMatch) matchScore += 0.4;
  if (neighborhoodMatch) matchScore += 0.3;
  if (cityMatch) matchScore += 0.2;
  if (stateMatch) matchScore += 0.1;

  // Fuzzy match fallback
  if (matchScore === 0) {
    const providedWords = provided.split(/\s+/).filter(w => w.length > 3);
    const geocodedWords = geocoded.split(/\s+/).filter(w => w.length > 3);
    
    const commonWords = providedWords.filter(pw => 
      geocodedWords.some(gw => gw.includes(pw) || pw.includes(gw))
    );
    
    matchScore = Math.min(commonWords.length / Math.max(providedWords.length, 1) * 0.5, 0.5);
  }

  return {
    matches: matchScore >= 0.3,
    confidence: Math.min(matchScore, 1.0),
    reason: matchScore >= 0.5 ? 'Strong address match' :
            matchScore >= 0.3 ? 'Partial address match' :
            'Address does not match GPS location',
    geocodedAddress: geocodedAddress.formattedAddress,
    details: {
      cityMatch,
      stateMatch,
      streetMatch,
      neighborhoodMatch
    }
  };
};

/**
 * Search for places (optional - for autocomplete feature)
 */
const searchPlaces = async (query, location = null) => {
  try {
    const params = {
      input: query,
      api_key: OLA_API_KEY
    };

    if (location) {
      params.location = `${location.lat},${location.lng}`;
      params.radius = 5000; // 5km radius
    }

    const response = await axios.get(`${OLA_BASE_URL}/autocomplete`, {
      params,
      timeout: 3000
    });

    return response.data.predictions || [];
  } catch (error) {
    console.error('Place search failed:', error.message);
    return [];
  }
};

module.exports = {
  reverseGeocode,
  validateAddressMatch,
  searchPlaces // Optional
};
