const API_KEY = 'ff69b1a0298a70cf5d1a1fc051f23a21'; // Replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEOCODE_URL = 'https://api.openweathermap.org/geo/1.0';
const ICON_URL = 'https://openweathermap.org/img/wn/';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const searchDropdown = document.getElementById('searchDropdown');
const currentWeather = document.getElementById('currentWeather');
const forecastContainer = document.getElementById('forecastContainer');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const loadingSkeleton = document.getElementById('loading-skeleton');

// State
const STORAGE_KEY = 'weatherAppRecentSearches';
let recentSearches = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    updateSearchDropdown();
    
    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    currentLocationBtn.addEventListener('click', getCurrentLocationWeather);
    
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    cityInput.addEventListener('focus', showSearchDropdown);
    document.addEventListener('click', hideSearchDropdown);
});

// Main Functions
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

async function getCurrentLocationWeather() {
    if (!navigator.geolocation) {
        return await tryIpBasedLocation();
    }

    try {
        showLoading();
        
        // Get GPS position
        const gpsPosition = await getGpsLocation();
        const { latitude, longitude } = gpsPosition.coords;
        
        // Get location name first
        const locationName = await getLocationName(latitude, longitude);
        
        // Then get weather data
        const weather = await getWeatherDataByCoords(latitude, longitude);
        
        displayWeather(weather);
        addToRecentSearches(locationName); // Use actual location name
        
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

// GPS-based location with proper timeouts
function getGpsLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
                timeout: 10000,
                maximumAge: 0,
                enableHighAccuracy: true
            }
        );
    });
}

// IP-based fallback
async function tryIpBasedLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/', {
            signal: AbortSignal.timeout(5000)
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

// Enhanced error messages
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

function getFriendlyLocationError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return 'Location access was denied. Please enable permissions in your browser settings.';
        case error.POSITION_UNAVAILABLE:
            return 'We couldn\'t detect your location. Please check: \n' +
                   '1. Your device has location services enabled \n' +
                   '2. You\'re connected to the internet \n' +
                   '3. Try again outdoors if indoors';
        case error.TIMEOUT:
            return 'Location detection timed out. Please try again in an area with better signal.';
        default:
            return 'Couldn\'t determine your location. Error: ' + error.message;
    }
}

// Make sure this is properly connected to your button
document.getElementById('currentLocationBtn').addEventListener('click', getCurrentLocationWeather);

// API Functions
async function getWeatherData(city) {
    try {
        // First get coordinates
        const geoResponse = await fetch(
            `${GEOCODE_URL}/direct?q=${city}&limit=1&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!geoResponse.ok) throw new Error('City not found');
        const geoData = await geoResponse.json();
        if (!geoData.length) throw new Error('City not found');
        
        const { lat, lon, name, country } = geoData[0];
        
        // Then get weather data
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        ).catch(handleNetworkError);
        
        if (!weatherResponse.ok) throw new Error('Weather data not available');
        const currentData = await weatherResponse.json();
        
        // Get forecast
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

async function getWeatherDataByCoords(lat, lon) {
    try {
        // Get location name
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

function handleNetworkError(error) {
    console.error("Network error:", error);
    throw new Error("Failed to connect to weather service");
}

// Data Processing
function processCurrentWeather(data) {
    return {
        date: formatDate(new Date(data.dt * 1000)),
        temp: Math.round(data.main.temp * 10) / 10,
        feels_like: Math.round(data.main.feels_like * 10) / 10,
        humidity: data.main.humidity,
        wind_speed: Math.round(data.wind.speed * 10) / 10,
        weather: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon
    };
}

function processForecastData(forecastData) {
    const dailyForecasts = [];
    const daysProcessed = new Set();
    
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toDateString();
        
        if (!daysProcessed.has(dateString)) {
            daysProcessed.add(dateString);
            
            dailyForecasts.push({
                date: date, // Store Date object
                temp_min: Math.round(item.main.temp_min * 10) / 10,
                temp_max: Math.round(item.main.temp_max * 10) / 10,
                humidity: item.main.humidity,
                wind_speed: Math.round(item.wind.speed * 10) / 10,
                icon: item.weather[0].icon
            });
        }
    });
    
    return dailyForecasts.slice(0, 5);
}

// Display Functions
function displayWeather(data) {
    // Current weather
    const current = data.current;
    document.getElementById('location').textContent = data.cityName;
    document.getElementById('date').textContent = current.date;
    document.getElementById('temperature').textContent = `${current.temp}°C`;
    document.getElementById('wind').innerHTML = `Wind: <span class="font-medium">${current.wind_speed} M/S</span>`;
    document.getElementById('humidity').innerHTML = `Humidity: <span class="font-medium">${current.humidity}%</span>`;
    document.getElementById('conditions').innerHTML = `Conditions: <span class="font-medium">${current.description}</span>`;
    document.getElementById('weatherIcon').src = `${ICON_URL}${current.icon}@2x.png`;
    
    // Forecast
    displayForecast(data.daily);
    currentWeather.classList.remove('hidden');
}

function displayForecast(dailyForecast) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';
    
    dailyForecast.forEach(day => {
        const dateObj = new Date(day.date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card flex-shrink-0 rounded-xl p-4 w-full sm:w-48 text-center';
        
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
function addToRecentSearches(city) {
    // Remove duplicates (case insensitive)
    recentSearches = recentSearches.filter(item => 
        item.toLowerCase() !== city.toLowerCase()
    );
    
    // Add to beginning of array
    recentSearches.unshift(city);
    
    // Keep only last 5 searches
    if (recentSearches.length > 5) {
        recentSearches.pop();
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
    
    // Update dropdown
    updateSearchDropdown();
}

function updateSearchDropdown() {
    searchDropdown.innerHTML = '';
    
    if (recentSearches.length === 0) {
        searchDropdown.classList.add('hidden');
        return;
    }
    
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
    
    // Add clear button
    const clearBtn = document.createElement('div');
    clearBtn.className = 'px-4 py-2 text-red-500 text-sm cursor-pointer border-t border-gray-200 flex items-center';
    clearBtn.innerHTML = `
        <i class="fas fa-trash mr-2"></i>
        <span>Clear recent searches</span>
    `;
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        recentSearches = [];
        localStorage.removeItem(STORAGE_KEY);
        searchDropdown.classList.add('hidden');
    });
    searchDropdown.appendChild(clearBtn);
}

function showSearchDropdown() {
    if (recentSearches.length > 0) {
        searchDropdown.classList.remove('hidden');
    }
}

function hideSearchDropdown(e) {
    if (!e.target.closest('#cityInput') && !e.target.closest('#searchDropdown')) {
        searchDropdown.classList.add('hidden');
    }
}

// Utility Functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showLoading() {
    loadingSkeleton.classList.remove('hidden');
    loading.classList.remove('hidden');
    currentWeather.classList.add('hidden');
}

function hideLoading() {
    loadingSkeleton.classList.add('hidden');
    loading.classList.add('hidden');
}

function showError(message) {
    error.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    error.classList.remove('hidden');
    setTimeout(() => error.classList.add('hidden'), 5000);
}

function hideError() {
    error.classList.add('hidden');
}

// Autocomplete functionality
cityInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if(query.length > 2) {
        const suggestions = await getLocationSuggestions(query);
        showAutocompleteSuggestions(suggestions);
    }
});

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