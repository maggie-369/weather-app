// API Configuration
const API_KEY = 'ff69b1a0298a70cf5d1a1fc051f23a21'; // OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5'; // Base URL for weather data
const GEOCODE_URL = 'https://api.openweathermap.org/geo/1.0'; // URL for geocoding API
const ICON_URL = 'https://openweathermap.org/img/wn/'; // Base URL for weather icons

// DOM Elements - Cache frequently accessed elements
const cityInput = document.getElementById('cityInput'); // City search input
const searchBtn = document.getElementById('searchBtn'); // Search button
const currentLocationBtn = document.getElementById('currentLocationBtn'); // Current location button
const searchDropdown = document.getElementById('searchDropdown'); // Recent searches dropdown
const currentWeather = document.getElementById('currentWeather'); // Current weather display
const forecastContainer = document.getElementById('forecastContainer'); // Forecast container
const loading = document.getElementById('loading'); // Loading spinner
const error = document.getElementById('error'); // Error message container
const loadingSkeleton = document.getElementById('loading-skeleton'); // Loading skeleton UI

// Application State
const STORAGE_KEY = 'weatherAppRecentSearches'; // LocalStorage key for recent searches
let recentSearches = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; // Array to store recent searches

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateSearchDropdown(); // Populate recent searches dropdown
    
    // Set up event listeners
    searchBtn.addEventListener('click', handleSearch); // Search button click
    currentLocationBtn.addEventListener('click', getCurrentLocationWeather); // Current location button
    
    // Handle Enter key in search input
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Show/hide recent searches dropdown
    cityInput.addEventListener('focus', showSearchDropdown);
    document.addEventListener('click', hideSearchDropdown);
});

// Main Functions

/**
 * Handles the city search functionality
 * 1. Validates input
 * 2. Shows loading state
 * 3. Fetches weather data
 * 4. Updates UI
 * 5. Handles errors
 */
async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    
    try {
        showLoading();
        const weatherData = await getWeatherData(city);
        displayWeather(weatherData);
        addToRecentSearches(city);
        hideError();
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

/**
 * Gets weather for user's current location with fallback to IP-based location
 * 1. Tries GPS location first
 * 2. Falls back to IP location if GPS fails
 * 3. Shows appropriate error messages
 */
async function getCurrentLocationWeather() {
    if (!navigator.geolocation) {
        return await tryIpBasedLocation(); // Fallback if geolocation not supported
    }

    try {
        showLoading();
        
        // Get GPS coordinates
        const gpsPosition = await getGpsLocation();
        const { latitude, longitude } = gpsPosition.coords;
        
        // Get human-readable location name
        const locationName = await getLocationName(latitude, longitude);
        
        // Get weather data for coordinates
        const weather = await getWeatherDataByCoords(latitude, longitude);
        
        displayWeather(weather);
        addToRecentSearches(locationName);
        
    } catch (error) {
        console.error('GPS location failed, trying IP fallback:', error);
        const ipLocation = await tryIpBasedLocation();
        if (ipLocation) {
            const weather = await getWeatherDataByCoords(
                ipLocation.latitude,
                ipLocation.longitude
            );
            displayWeather(weather);
            addToRecentSearches(`${ipLocation.city}, ${ipLocation.country}`);
        } else {
            throw error;
        }
    } finally {
        hideLoading();
    }
}

/**
 * Wrapper for geolocation API with timeout and high accuracy
 * @returns Promise with position data
 */
function getGpsLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
                timeout: 10000, // 10 second timeout
                maximumAge: 0, // Don't use cached position
                enableHighAccuracy: true // Request best possible accuracy
            }
        );
    });
}

/**
 * Fallback location using IP address when GPS fails
 * @returns Object with latitude, longitude, city and country
 */
async function tryIpBasedLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/', {
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        const data = await response.json();
        return {
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city,
            country: data.country_code
        };
        
    } catch (error) {
        console.warn('IP location failed:', error);
        return null;
    }
}

/**
 * Converts technical geolocation errors to user-friendly messages
 * @param error Geolocation error object
 * @returns String with friendly error message
 */
function getFriendlyLocationError(error) {
    const tips = `
    Troubleshooting Tips:
    1. Enable location services on your device
    2. Check browser permissions (🔒 icon in address bar)
    3. Try again outdoors
    4. Connect to WiFi for better accuracy`;
    
    switch(error.code) {
        case 1: // PERMISSION_DENIED
            return `Location access denied. ${tips}`;
        case 2: // POSITION_UNAVAILABLE
            return `Couldn't detect your location. ${tips}`;
        case 3: // TIMEOUT
            return `Location detection timed out. ${tips}`;
        default:
            return `Location error: ${error.message || 'Unknown error'}. ${tips}`;
    }
}

// API Functions

/**
 * Fetches weather data for a city name
 * @param city City name to search for
 * @returns Object with weather data
 */
async function getWeatherData(city) {
    try {
        // First get coordinates for the city
        const geoResponse = await fetch(
            `${GEOCODE_URL}/direct?q=${city}&limit=1&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!geoResponse.ok) throw new Error('City not found');
        const geoData = await geoResponse.json();
        if (!geoData.length) throw new Error('City not found');
        
        const { lat, lon, name, country } = geoData[0];
        
        // Get current weather data
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!weatherResponse.ok) throw new Error('Weather data not available');
        const currentData = await weatherResponse.json();
        
        // Get forecast data
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!forecastResponse.ok) throw new Error('Forecast not available');
        const forecastData = await forecastResponse.json();
        
        return {
            cityName: `${name}, ${country}`,
            current: processCurrentWeather(currentData),
            daily: processForecastData(forecastData)
        };
    } catch (err) {
        throw new Error(err.message || 'Failed to fetch weather data');
    }
}

/**
 * Fetches weather data by coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns Object with weather data
 */
async function getWeatherDataByCoords(lat, lon) {
    try {
        // Get human-readable location name
        const geoResponse = await fetch(
            `${GEOCODE_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!geoResponse.ok) throw new Error('Location service error');
        const geoData = await geoResponse.json();
        
        // Get current weather
        const currentResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!currentResponse.ok) throw new Error('Current weather error');
        const currentData = await currentResponse.json();
        
        // Get forecast
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!forecastResponse.ok) throw new Error('Forecast error');
        const forecastData = await forecastResponse.json();
        
        return {
            cityName: geoData[0] ? `${geoData[0].name}, ${geoData[0].country}` : 'Your Location',
            current: processCurrentWeather(currentData),
            daily: processForecastData(forecastData)
        };
    } catch (err) {
        throw new Error(err.message || 'Failed to fetch weather data');
    }
}

/**
 * Handles network errors consistently
 * @param error Error object
 * @throws Error with user-friendly message
 */
function handleNetworkError(error) {
    console.error("Network error:", error);
    throw new Error("Failed to connect to weather service");
}

// Data Processing Functions

/**
 * Processes raw current weather data into display-ready format
 * @param data Raw API response
 * @returns Processed current weather object
 */
function processCurrentWeather(data) {
    return {
        date: formatDate(new Date(data.dt * 1000)), // Convert UNIX timestamp to Date
        temp: Math.round(data.main.temp * 10) / 10, // Round to 1 decimal place
        feels_like: Math.round(data.main.feels_like * 10) / 10,
        humidity: data.main.humidity,
        wind_speed: Math.round(data.wind.speed * 10) / 10,
        weather: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon
    };
}

/**
 * Processes forecast data into daily forecasts
 * @param forecastData Raw forecast API response
 * @returns Array of daily forecast objects
 */
function processForecastData(forecastData) {
    const dailyForecasts = [];
    const daysProcessed = new Set(); // Track unique days
    
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toDateString();
        
        // Only include one forecast per day
        if (!daysProcessed.has(dateString)) {
            daysProcessed.add(dateString);
            
            dailyForecasts.push({
                date: date, // Store Date object for formatting
                temp_min: Math.round(item.main.temp_min * 10) / 10,
                temp_max: Math.round(item.main.temp_max * 10) / 10,
                humidity: item.main.humidity,
                wind_speed: Math.round(item.wind.speed * 10) / 10,
                icon: item.weather[0].icon
            });
        }
    });
    
    return dailyForecasts.slice(0, 5); // Return next 5 days
}

// Display Functions

/**
 * Updates the UI with weather data
 * @param data Processed weather data object
 */
function displayWeather(data) {
    // Current weather section
    const current = data.current;
    document.getElementById('location').textContent = data.cityName;
    document.getElementById('date').textContent = current.date;
    document.getElementById('temperature').textContent = `${current.temp}°C`;
    document.getElementById('wind').innerHTML = `Wind: <span class="font-medium">${current.wind_speed} M/S</span>`;
    document.getElementById('humidity').innerHTML = `Humidity: <span class="font-medium">${current.humidity}%</span>`;
    document.getElementById('conditions').innerHTML = `Conditions: <span class="font-medium">${current.description}</span>`;
    document.getElementById('weatherIcon').src = `${ICON_URL}${current.icon}@2x.png`;
    
    // Forecast section
    displayForecast(data.daily);
    currentWeather.classList.remove('hidden'); // Show weather container
}

/**
 * Creates and displays forecast cards
 * @param dailyForecast Array of daily forecast data
 */
function displayForecast(dailyForecast) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = ''; // Clear previous forecasts
    
    dailyForecast.forEach(day => {
        const dateObj = new Date(day.date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Create forecast card element
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card flex-shrink-0 rounded-xl p-4 w-full sm:w-48 text-center';
        
        // Populate card with forecast data
        forecastCard.innerHTML = `
            <div class="font-bold mb-1">${dayName}</div>
            <div class="text-sm mb-2">${date}</div>
            <img src="${ICON_URL}${day.icon}@2x.png" alt="Weather icon" class="w-16 h-16 mx-auto">
            <div class="text-xl font-bold my-2">${day.temp_min}°C / ${day.temp_max}°C</div>
            <div class="text-sm space-y-1">
                <div>Wind: ${day.wind_speed} M/S</div>
                <div>Humidity: ${day.humidity}%</div>
            </div>
        `;
        forecastContainer.appendChild(forecastCard);
    });
}

// Recent Searches Functions

/**
 * Adds a city to recent searches and updates storage
 * @param city City name to add
 */
function addToRecentSearches(city) {
    // Remove any existing entries for this city (case insensitive)
    recentSearches = recentSearches.filter(item => 
        item.toLowerCase() !== city.toLowerCase()
    );
    
    // Add to beginning of array (most recent first)
    recentSearches.unshift(city);
    
    // Limit to 5 most recent searches
    if (recentSearches.length > 5) {
        recentSearches.pop();
    }
    
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
    
    // Update the dropdown UI
    updateSearchDropdown();
}

/**
 * Updates the recent searches dropdown menu
 */
function updateSearchDropdown() {
    searchDropdown.innerHTML = ''; // Clear existing items
    
    if (recentSearches.length === 0) {
        searchDropdown.classList.add('hidden');
        return;
    }
    
    // Add each recent search as a clickable item
    recentSearches.forEach(city => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center';
        item.innerHTML = `
            <i class="fas fa-search text-gray-500 mr-2"></i>
            <span>${city}</span>
        `;
        item.addEventListener('click', () => {
            cityInput.value = city;
            handleSearch();
            searchDropdown.classList.add('hidden');
        });
        searchDropdown.appendChild(item);
    });
    
    // Add clear button at bottom
    const clearBtn = document.createElement('div');
    clearBtn.className = 'px-4 py-2 text-red-500 text-sm cursor-pointer border-t border-gray-200 flex items-center';
    clearBtn.innerHTML = `
        <i class="fas fa-trash mr-2"></i>
        <span>Clear recent searches</span>
    `;
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent dropdown from closing immediately
        recentSearches = [];
        localStorage.removeItem(STORAGE_KEY);
        searchDropdown.classList.add('hidden');
    });
    searchDropdown.appendChild(clearBtn);
}

/**
 * Shows the recent searches dropdown
 */
function showSearchDropdown() {
    if (recentSearches.length > 0) {
        searchDropdown.classList.remove('hidden');
    }
}

/**
 * Hides the recent searches dropdown when clicking outside
 * @param e Click event
 */
function hideSearchDropdown(e) {
    if (!e.target.closest('#cityInput') && !e.target.closest('#searchDropdown')) {
        searchDropdown.classList.add('hidden');
    }
}

// Utility Functions

/**
 * Formats a Date object into a readable string
 * @param date Date object to format
 * @returns Formatted date string
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Shows loading state (spinner and skeleton UI)
 */
function showLoading() {
    loadingSkeleton.classList.remove('hidden');
    loading.classList.remove('hidden');
    currentWeather.classList.add('hidden');
}

/**
 * Hides loading state
 */
function hideLoading() {
    loadingSkeleton.classList.add('hidden');
    loading.classList.add('hidden');
}

/**
 * Displays an error message to the user
 * @param message Error message to display
 */
function showError(message) {
    error.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    error.classList.remove('hidden');
    // Auto-hide after 5 seconds
    setTimeout(() => error.classList.add('hidden'), 5000);
}

/**
 * Hides any visible error message
 */
function hideError() {
    error.classList.add('hidden');
}

// Autocomplete functionality (currently unused in this version)
cityInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if(query.length > 2) {
        const suggestions = await getLocationSuggestions(query);
        showAutocompleteSuggestions(suggestions);
    }
});

/**
 * Gets a human-readable location name from coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns Location name string
 */
async function getLocationName(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            const location = data[0];
            // Format: "Medchal Mandal, IN" or similar
            return `${location.name}${location.state ? ', ' + location.state : ''}, ${location.country}`;
        }
        return `Near ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    } catch (error) {
        console.error('Error getting location name:', error);
        return 'My Location';
    }
}