/**
 * API Call Optimization Refactor
 * Key improvements:
 * - Request caching
 * - Deduplication
 * - Error resilience
 * - Parameter validation
 */

// 1. Create API service module
const WeatherAPI = {
    cache: new Map(),
    lastRequestTime: 0,
    RATE_LIMIT: 1000, // 1 second between requests

    /**
     * Get weather data with caching and retry logic
     * @param {string} endpoint - API endpoint ('weather'|'forecast')
     * @param {Object} params - Request parameters
     * @param {number} retries - Remaining retry attempts
     * @returns {Promise<Object>}
     */
    async fetchWeatherData(endpoint, params = {}, retries = 2) {
        // Validate input
        if (!endpoint || !API_KEY) {
            throw new Error('Invalid API configuration');
        }

        // Create cache key
        const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const { data, timestamp } = this.cache.get(cacheKey);
            if (Date.now() - timestamp < 300000) { // 5 minute cache
                console.log(`Returning cached data for ${cacheKey}`);
                return data;
            }
        }

        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < this.RATE_LIMIT) {
            await new Promise(resolve => 
                setTimeout(resolve, this.RATE_LIMIT - (now - this.lastRequestTime))
            );
        }

        try {
            // Build URL
            const url = new URL(`${BASE_URL}/${endpoint}`);
            url.searchParams.append('appid', API_KEY);
            url.searchParams.append('units', 'metric');
            
            // Add parameters
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value);
                }
            });

            console.log(`Fetching: ${url.toString()}`);
            
            const response = await fetch(url, {
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            this.lastRequestTime = Date.now();

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache successful responses
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;

        } catch (error) {
            console.warn(`API request failed (${retries} retries left):`, error);
            
            if (retries > 0) {
                return this.fetchWeatherData(endpoint, params, retries - 1);
            }

            throw new Error(`Failed after multiple attempts: ${error.message}`);
        }
    },

    // Specific endpoint methods
    async getCurrentWeather(city) {
        return this.fetchWeatherData('weather', { q: city });
    },

    async getWeatherByCoords(lat, lon) {
        return this.fetchWeatherData('weather', { lat, lon });
    },

    async getForecast(lat, lon) {
        return this.fetchWeatherData('forecast', { lat, lon });
    }
};

// 2. Replace old API calls with optimized versions
async function getWeatherData(city) {
    try {
        // First get coordinates
        const geoResponse = await fetch(
            `${GEOCODE_URL}/direct?q=${city}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoResponse.json();
        
        if (!geoData.length) throw new Error('City not found');
        const { lat, lon, name, country } = geoData[0];

        // Parallel API calls
        const [current, forecast] = await Promise.all([
            WeatherAPI.getWeatherByCoords(lat, lon),
            WeatherAPI.getForecast(lat, lon)
        ]);

        return {
            cityName: `${name}, ${country}`,
            current: processCurrentWeather(current),
            daily: processForecastData(forecast)
        };

    } catch (error) {
        console.error('Weather data fetch failed:', error);
        throw new Error(`Could not retrieve weather: ${error.message}`);
    }
}

// 3. Update helper functions
function processCurrentWeather(data) {
    // Add data validation
    if (!data?.main || !data.weather) {
        throw new Error('Invalid current weather data');
    }
    
    return {
        temp: roundTemp(data.main.temp),
        feels_like: roundTemp(data.main.feels_like),
        humidity: data.main.humidity,
        wind_speed: roundTemp(data.wind.speed),
        description: data.weather[0]?.description || 'N/A',
        icon: data.weather[0]?.icon || '01d'
    };
}

function roundTemp(value) {
    return Math.round((Number(value) || 0) * 10) / 10;
}

// 4. Initialize API service
document.addEventListener('DOMContentLoaded', () => {
    // Clear cache when page reloads
    WeatherAPI.cache.clear();
});