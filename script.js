/**
 * API Call Optimization Refactor
 * Key improvements:
 * - Request caching
 * - Deduplication
 * - Error handling standardization
 * - Parameter validation
 */

// 1. Create API service module
const WeatherAPI = {
    cache: new Map(),
    lastRequestTime: 0,
    RATE_LIMIT: 1000, // 1 second between calls
  
    /**
     * Get weather data with caching and rate limiting
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Request parameters
     * @returns {Promise<Object>}
     */
    async fetchWeatherData(endpoint, params = {}) {
      // Validate input
      if (!endpoint) throw new Error('Endpoint is required');
      if (!API_KEY) throw new Error('API key not configured');
  
      // Create cache key
      const cacheKey = this.createCacheKey(endpoint, params);
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        console.log('Returning cached data for', cacheKey);
        return this.cache.get(cacheKey);
      }
  
      // Rate limit protection
      await this.enforceRateLimit();
  
      try {
        const url = this.buildRequestUrl(endpoint, params);
        const response = await this.executeRequest(url);
  
        // Cache successful responses
        this.cache.set(cacheKey, response);
        return response;
  
      } catch (error) {
        console.error('API request failed:', error);
        throw this.normalizeError(error);
      }
    },
  
    // Helper methods
    createCacheKey(endpoint, params) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
      return `${endpoint}?${sortedParams}`;
    },
  
    async enforceRateLimit() {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      
      if (elapsed < this.RATE_LIMIT) {
        const delay = this.RATE_LIMIT - elapsed;
        console.log(`Rate limiting - delaying ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      this.lastRequestTime = Date.now();
    },
  
    buildRequestUrl(endpoint, params) {
      const baseUrl = `${BASE_URL}/${endpoint}`;
      const queryParams = new URLSearchParams({
        ...params,
        appid: API_KEY,
        units: 'metric'
      });
      return `${baseUrl}?${queryParams}`;
    },
  
    async executeRequest(url) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
  
      const response = await fetch(url, {
        signal: controller.signal
      });
  
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
  
      return response.json();
    },
  
    normalizeError(error) {
      // Standardize different error types
      if (error.name === 'AbortError') {
        return new Error('Request timed out');
      }
      return error instanceof Error ? error : new Error(String(error));
    }
  };
  
  // 2. Refactored API functions using new service
  async function getWeatherData(city) {
    try {
      // First get coordinates
      const geoData = await WeatherAPI.fetchWeatherData('geo/1.0/direct', { q: city });
      if (!geoData?.length) throw new Error('Location not found');
  
      const { lat, lon, name, country } = geoData[0];
  
      // Get current and forecast in parallel
      const [current, forecast] = await Promise.all([
        WeatherAPI.fetchWeatherData('data/2.5/weather', { lat, lon }),
        WeatherAPI.fetchWeatherData('data/2.5/forecast', { lat, lon })
      ]);
  
      return {
        cityName: `${name}, ${country}`,
        current: processCurrentWeather(current),
        daily: processForecastData(forecast)
      };
  
    } catch (error) {
      console.error('Weather data fetch failed:', error);
      throw error;
    }
  }
  
  // 3. Updated location-based function
  async function getWeatherDataByCoords(lat, lon) {
    try {
      const [geoData, current, forecast] = await Promise.all([
        WeatherAPI.fetchWeatherData('geo/1.0/reverse', { lat, lon }),
        WeatherAPI.fetchWeatherData('data/2.5/weather', { lat, lon }),
        WeatherAPI.fetchWeatherData('data/2.5/forecast', { lat, lon })
      ]);
  
      return {
        cityName: geoData[0] ? `${geoData[0].name}, ${geoData[0].country}` : 'Current Location',
        current: processCurrentWeather(current),
        daily: processForecastData(forecast)
      };
  
    } catch (error) {
      console.error('Location weather fetch failed:', error);
      throw error;
    }
  }
  
  // 4. Clear cache when needed (e.g., on city change)
  function clearWeatherCache() {
    WeatherAPI.cache.clear();
    console.log('Weather cache cleared');
  }