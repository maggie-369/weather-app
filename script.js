/**
 * Current Location Button Implementation
 * Provides accurate weather for user's current position with:
 * - GPS-based location detection
 * - IP-based fallback
 * - Permission handling
 * - Error recovery
 */

// 1. HTML Button (reference)
/*
<button id="currentLocationBtn" class="flex items-center justify-center gap-2 bg-weather-accent text-weather-dark px-6 py-3 rounded-full font-medium hover:bg-white transition">
  <i class="fas fa-location-arrow"></i>
  <span>Use Current Location</span>
</button>
*/

// 2. Main Location Functionality
class LocationService {
    constructor() {
      this.API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';
      this.BASE_URL = 'https://api.openweathermap.org/data/2.5';
      this.GEOCODE_URL = 'https://api.openweathermap.org/geo/1.0';
      this.locationCache = new Map();
    }
  
    /**
     * Initialize location button functionality
     */
    init() {
      const locationBtn = document.getElementById('currentLocationBtn');
      locationBtn.addEventListener('click', () => this.handleLocationRequest());
      
      // Check for cached location
      this.checkCachedLocation();
    }
  
    /**
     * Main location handling flow
     */
    async handleLocationRequest() {
      try {
        this.showLoadingState(true);
        
        // Step 1: Try precise GPS location
        const position = await this.getGPSPosition();
        const weather = await this.processLocation(position);
        
        // Step 2: Update UI
        this.displayWeather(weather);
        this.addToRecentSearches(`My Location (${weather.cityName})`);
        
      } catch (error) {
        console.error('Location error:', error);
        await this.handleLocationError(error);
      } finally {
        this.showLoadingState(false);
      }
    }
  
    /**
     * Attempt GPS location with error handling
     */
    async getGPSPosition() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('GEOLOCATION_UNAVAILABLE'));
          return;
        }
  
        navigator.geolocation.getCurrentPosition(
          position => {
            // Validate coordinates
            if (!position?.coords?.latitude || !position?.coords?.longitude) {
              reject(new Error('INVALID_COORDINATES'));
            } else {
              resolve(position);
            }
          },
          error => {
            reject(this.translateGeolocationError(error));
          },
          {
            timeout: 10000,
            maximumAge: 300000, // 5 minute cache
            enableHighAccuracy: true
          }
        );
      });
    }
  
    /**
     * Process obtained location into weather data
     */
    async processLocation(position) {
      const { latitude, longitude } = position.coords;
      
      // Check cache first
      const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
      if (this.locationCache.has(cacheKey)) {
        return this.locationCache.get(cacheKey);
      }
  
      // Get location details
      const [cityName, weatherData] = await Promise.all([
        this.getLocationName(latitude, longitude),
        this.getWeatherData(latitude, longitude)
      ]);
  
      const result = { cityName, weatherData };
      this.locationCache.set(cacheKey, result);
      return result;
    }
  
    /**
     * Fallback error handling
     */
    async handleLocationError(error) {
      const errorElement = document.getElementById('locationError');
      
      switch(error.code) {
        case 'PERMISSION_DENIED':
          errorElement.textContent = 'Please enable location permissions in browser settings';
          break;
          
        case 'TIMEOUT':
          // Attempt IP-based fallback
          try {
            const ipLocation = await this.getIPLocation();
            const weather = await this.processLocation({
              coords: {
                latitude: ipLocation.lat,
                longitude: ipLocation.lon
              }
            });
            this.displayWeather(weather);
            this.addToRecentSearches(`Approximate: ${ipLocation.city}`);
            return;
          } catch (ipError) {
            errorElement.textContent = 'Could not determine your location. Please try again or search manually.';
          }
          break;
          
        default:
          errorElement.textContent = error.message;
      }
      
      errorElement.classList.remove('hidden');
    }
  
    // Helper methods
    async getLocationName(lat, lon) {
      const response = await fetch(`${this.GEOCODE_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.API_KEY}`);
      const data = await response.json();
      return data[0]?.name || 'Current Location';
    }
  
    async getWeatherData(lat, lon) {
      const response = await fetch(`${this.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.API_KEY}`);
      return response.json();
    }
  
    async getIPLocation() {
      const response = await fetch('https://ipapi.co/json/');
      return response.json();
    }
  
    translateGeolocationError(error) {
      const errors = {
        1: { code: 'PERMISSION_DENIED', message: 'Location access denied' },
        2: { code: 'POSITION_UNAVAILABLE', message: 'Location unavailable' },
        3: { code: 'TIMEOUT', message: 'Location request timed out' }
      };
      return errors[error.code] || { code: 'UNKNOWN', message: error.message };
    }
  
    showLoadingState(show) {
      const btn = document.getElementById('currentLocationBtn');
      if (show) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        btn.disabled = true;
      } else {
        btn.innerHTML = '<i class="fas fa-location-arrow"></i> Use Current Location';
        btn.disabled = false;
      }
    }
  }
  
  // 3. Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    const locationService = new LocationService();
    locationService.init();
  });