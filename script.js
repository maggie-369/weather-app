/**
 * Enhanced location detection with comprehensive error handling
 * Fixes edge cases in:
 * - Permission denied scenarios
 * - Unavailable location services
 * - Timeout handling
 * - Coordinate validation
 */
async function getCurrentLocationWeather() {
    // First check if geolocation is supported
    if (!navigator.geolocation) {
        showError("Geolocation not supported by your browser");
        console.warn("Geolocation API not available");
        return await tryIpBasedLocation(); // Fallback to IP-based location
    }

    try {
        showLoading();
        
        // Check permission state first to provide better UX
        const permissionStatus = await navigator.permissions?.query({ name: 'geolocation' });
        if (permissionStatus?.state === 'denied') {
            throw new Error(
                'Location access was previously denied. ' +
                'Please enable permissions in your browser settings and refresh.'
            );
        }

        // Attempt high-accuracy location first
        const position = await new Promise((resolve, reject) => {
            // First try: High accuracy with fresh data (max 10s wait)
            navigator.geolocation.getCurrentPosition(
                resolve,
                (highAccuracyError) => {
                    console.warn("High accuracy failed, falling back to basic:", highAccuracyError);
                    
                    // Second try: Basic accuracy with cached data (max 5s wait)
                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        (basicError) => {
                            console.error("Basic location failed:", basicError);
                            reject(enhanceLocationError(basicError));
                        },
                        {
                            timeout: 5000,
                            maximumAge: 300000 // 5 minute cache
                        }
                    );
                },
                {
                    timeout: 10000,
                    maximumAge: 0, // No cached data
                    enableHighAccuracy: true
                }
            );
        });

        // Validate received coordinates
        const { latitude, longitude, accuracy } = position.coords;
        if (!latitude || !longitude) {
            throw new Error("Received invalid coordinates");
        }
        
        console.log(`Location obtained (Accuracy: ${accuracy}m)`);

        // Get location name before fetching weather
        const locationName = await getLocationName(latitude, longitude);
        const weatherData = await getWeatherDataByCoords(latitude, longitude);
        
        displayWeather(weatherData);
        addToRecentSearches(locationName);

    } catch (error) {
        console.error("Location detection failed:", error);
        
        // Attempt IP-based fallback
        try {
            const ipLocation = await tryIpBasedLocation();
            if (ipLocation) {
                const weather = await getWeatherDataByCoords(
                    ipLocation.latitude,
                    ipLocation.longitude
                );
                displayWeather(weather);
                addToRecentSearches(`Approximate Location (${ipLocation.city})`);
                return;
            }
        } catch (fallbackError) {
            console.error("IP fallback also failed:", fallbackError);
        }
        
        showError(error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Transforms geolocation errors into user-friendly messages
 * with troubleshooting guidance
 */
function enhanceLocationError(error) {
    const baseMessage = "Location detection failed: ";
    const troubleshooting = " Please check: 1) Device location is enabled, 2) Browser permissions, 3) Internet connection";
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return baseMessage + "Permission denied." + troubleshooting;
        case error.POSITION_UNAVAILABLE:
            return baseMessage + "Location services unavailable." + troubleshooting;
        case error.TIMEOUT:
            return baseMessage + "Request timed out. Try moving to an open area.";
        case error.UNKNOWN_ERROR:
            return baseMessage + "Unknown error occurred. Try again later.";
        default:
            return baseMessage + error.message;
    }
}

/**
 * IP-based fallback location provider
 * Uses ipapi.co's free tier (1000 req/month)
 */
async function tryIpBasedLocation() {
    try {
        console.log("Attempting IP-based location fallback...");
        const response = await fetch('https://ipapi.co/json/', {
            signal: AbortSignal.timeout(3000) // 3s timeout
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const { latitude, longitude, city, country } = await response.json();
        
        if (!latitude || !longitude) {
            throw new Error("Invalid coordinates from IP API");
        }
        
        console.log(`IP location obtained: ${city}, ${country}`);
        return { latitude, longitude, city, country };
        
    } catch (error) {
        console.warn("IP location fallback failed:", error);
        return null;
    }
}