/**
 * COMPLETE LOCATION DETECTION FIXES
 * Handles edge cases including:
 * - Permission denied scenarios
 * - Device location services disabled
 * - Weak GPS signal
 * - Network connectivity issues
 */

// Main location handler with full error trapping
async function getCurrentLocationWeather() {
    // First verify browser support
    if (!navigator.geolocation) {
        const fallbackResult = await attemptIpFallback();
        if (!fallbackResult) {
            showError("Geolocation not supported and IP lookup failed");
        }
        return;
    }

    try {
        showLoading();
        
        // 1. Check permission state first
        const permission = await checkLocationPermission();
        if (permission === 'denied') {
            throw new LocationError('PERMISSION_DENIED');
        }

        // 2. Attempt GPS location
        const position = await getPositionWithFallback();
        
        // 3. Validate coordinates
        validateCoordinates(position.coords);
        
        // 4. Get location details
        const location = await processDetectedLocation(position);
        displayWeather(location.weatherData);
        addToRecentSearches(location.name);

    } catch (error) {
        await handleLocationFailure(error);
    } finally {
        hideLoading();
    }
}

/* ========== CORE LOCATION FUNCTIONS ========== */

/**
 * Checks current location permission state
 * @returns {Promise<'granted'|'prompt'|'denied'>}
 */
async function checkLocationPermission() {
    try {
        if (navigator.permissions) {
            const status = await navigator.permissions.query({ name: 'geolocation' });
            return status.state;
        }
        return 'prompt'; // Default if Permission API not available
    } catch (error) {
        console.warn("Permission check failed:", error);
        return 'prompt';
    }
}

/**
 * Attempts GPS location with high accuracy first,
 * then falls back to basic location
 */
function getPositionWithFallback() {
    return new Promise((resolve, reject) => {
        // High accuracy attempt (10s timeout, no cached data)
        navigator.geolocation.getCurrentPosition(
            resolve,
            (highAccuracyError) => {
                console.warn("High accuracy failed, trying basic mode");
                
                // Basic attempt (5s timeout, 5min cached data ok)
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    (basicError) => {
                        reject(new LocationError(basicError.code));
                    },
                    {
                        timeout: 5000,
                        maximumAge: 300000,
                        enableHighAccuracy: false
                    }
                );
            },
            {
                timeout: 10000,
                maximumAge: 0,
                enableHighAccuracy: true
            }
        );
    });
}

/* ========== VALIDATION HELPERS ========== */

function validateCoordinates(coords) {
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        throw new LocationError('INVALID_COORDS');
    }
    
    // Reject obviously wrong coordinates
    if (Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) {
        throw new LocationError('INVALID_COORDS');
    }
    
    console.log(`Location acquired (Accuracy: ${coords.accuracy}m)`);
}

/* ========== ERROR HANDLING ========== */

class LocationError extends Error {
    constructor(code) {
        super();
        this.code = code;
        this.message = this.getErrorMessage(code);
    }
    
    getErrorMessage(code) {
        const messages = {
            'PERMISSION_DENIED': 'Please enable location permissions in browser settings',
            'POSITION_UNAVAILABLE': 'Device location services disabled. Enable in system settings',
            'TIMEOUT': 'Signal weak. Try moving outdoors or near a window',
            'INVALID_COORDS': 'Invalid location data received',
            'NETWORK_FAILURE': 'Internet connection required for location'
        };
        return messages[code] || 'Location detection failed';
    }
}

async function handleLocationFailure(error) {
    console.error("Location error:", error.code, error.message);
    
    // Try IP fallback for certain error types
    if (['POSITION_UNAVAILABLE', 'TIMEOUT'].includes(error.code)) {
        const fallback = await attemptIpFallback();
        if (fallback) return;
    }
    
    showError(error.message + "\nTap to try again").onclick = getCurrentLocationWeather;
}

/* ========== FALLBACK MECHANISMS ========== */

async function attemptIpFallback() {
    try {
        const response = await fetch('https://ipapi.co/json/', { 
            signal: AbortSignal.timeout(3000) 
        });
        const { latitude, longitude, city, country } = await response.json();
        
        if (latitude && longitude) {
            const weather = await getWeatherDataByCoords(latitude, longitude);
            displayWeather(weather);
            addToRecentSearches(`Approximate: ${city}, ${country}`);
            return true;
        }
    } catch (ipError) {
        console.warn("IP fallback failed:", ipError);
    }
    return false;
}

/* ========== LOCATION PROCESSING ========== */

async function processDetectedLocation(position) {
    const { latitude, longitude } = position.coords;
    const [locationName, weatherData] = await Promise.all([
        getLocationName(latitude, longitude),
        getWeatherDataByCoords(latitude, longitude)
    ]);
    
    return {
        name: locationName,
        weatherData,
        coords: { latitude, longitude }
    };
}