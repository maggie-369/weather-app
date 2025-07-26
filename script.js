/**
 * CORE WEATHER COMPONENTS
 * Modular components for displaying weather data
 * Includes:
 * - Current weather card
 * - Forecast cards
 * - Weather condition icons
 * - Measurement displays
 */

// 1. Weather Card Component
class WeatherCard {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.elements = {
        location: null,
        date: null,
        icon: null,
        temp: null,
        wind: null,
        humidity: null,
        conditions: null
      };
      this.init();
    }
  
    init() {
      // Create DOM structure
      this.container.innerHTML = `
        <div class="weather-card bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white">
          <div class="flex flex-col md:flex-row justify-between">
            <div class="weather-info-left">
              <h2 id="location" class="text-2xl font-bold mb-1"></h2>
              <p id="date" class="text-blue-100 mb-4"></p>
              <div class="temp-container flex items-center">
                <img id="weatherIcon" class="w-20 h-20" alt="Weather icon">
                <span id="temperature" class="text-5xl font-bold"></span>
              </div>
            </div>
            <div class="weather-info-right mt-4 md:mt-0">
              <div class="space-y-3">
                <div class="weather-wind flex items-center">
                  <i class="fas fa-wind text-blue-200 mr-2 w-6 text-center"></i>
                  <span id="wind"></span>
                </div>
                <div class="weather-humidity flex items-center">
                  <i class="fas fa-tint text-blue-200 mr-2 w-6 text-center"></i>
                  <span id="humidity"></span>
                </div>
                <div class="weather-conditions flex items-center">
                  <i class="fas fa-cloud text-blue-200 mr-2 w-6 text-center"></i>
                  <span id="conditions"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
  
      // Cache DOM references
      this.elements.location = document.getElementById('location');
      this.elements.date = document.getElementById('date');
      this.elements.icon = document.getElementById('weatherIcon');
      this.elements.temp = document.getElementById('temperature');
      this.elements.wind = document.getElementById('wind');
      this.elements.humidity = document.getElementById('humidity');
      this.elements.conditions = document.getElementById('conditions');
    }
  
    update(data) {
      this.elements.location.textContent = data.location;
      this.elements.date.textContent = data.date;
      this.elements.icon.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
      this.elements.temp.textContent = `${data.temp}°C`;
      this.elements.wind.innerHTML = `Wind: <span class="font-medium">${data.windSpeed} M/S</span>`;
      this.elements.humidity.innerHTML = `Humidity: <span class="font-medium">${data.humidity}%</span>`;
      this.elements.conditions.innerHTML = `Conditions: <span class="font-medium">${data.conditions}</span>`;
    }
  }
  
  // 2. Forecast Card Component
  class ForecastCard {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.cards = [];
    }
  
    createCard(dayData) {
      const card = document.createElement('div');
      card.className = 'forecast-card bg-white/20 rounded-xl p-4 text-center backdrop-blur-sm';
      card.innerHTML = `
        <p class="font-medium mb-2">${dayData.day}</p>
        <p class="text-sm mb-1">${dayData.date}</p>
        <img src="https://openweathermap.org/img/wn/${dayData.icon}@2x.png" 
             alt="${dayData.conditions}" 
             class="w-16 h-16 mx-auto">
        <p class="text-xl font-bold my-2">
          <span class="min-temp">${dayData.tempMin}°</span> / 
          <span class="max-temp">${dayData.tempMax}°</span>
        </p>
        <div class="text-sm space-y-1">
          <p class="weather-wind">Wind: ${dayData.windSpeed} M/S</p>
          <p class="weather-humidity">Humidity: ${dayData.humidity}%</p>
        </div>
      `;
      return card;
    }
  
    update(forecastData) {
      this.container.innerHTML = '';
      this.cards = [];
      
      forecastData.forEach(day => {
        const card = this.createCard({
          day: new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
          date: new Date(day.dt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          icon: day.weather[0].icon,
          tempMin: Math.round(day.temp.min),
          tempMax: Math.round(day.temp.max),
          windSpeed: Math.round(day.wind_speed),
          humidity: day.humidity,
          conditions: day.weather[0].main
        });
        
        this.container.appendChild(card);
        this.cards.push(card);
      });
    }
  }
  
  // 3. Weather Icon Component
  const WeatherIcons = {
    getIcon(conditionCode, size = '2x') {
      const baseUrl = 'https://openweathermap.org/img/wn';
      return `${baseUrl}/${conditionCode}@${size}.png`;
    },
  
    getIconComponent(conditionCode, size = 'md') {
      const sizes = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-20 h-20'
      };
      
      return `
        <img src="${this.getIcon(conditionCode)}" 
             alt="${conditionCode}" 
             class="${sizes[size]} mx-auto">
      `;
    }
  };
  
  // 4. Measurement Display Component
  class MeasurementDisplay {
    constructor(type, value, unit) {
      this.type = type;
      this.value = value;
      this.unit = unit;
      this.icon = this.getIcon();
    }
  
    getIcon() {
      const icons = {
        temperature: 'fa-temperature-high',
        wind: 'fa-wind',
        humidity: 'fa-tint',
        pressure: 'fa-tachometer-alt'
      };
      return icons[this.type] || 'fa-info-circle';
    }
  
    render() {
      return `
        <div class="measurement flex items-center py-1">
          <i class="fas ${this.icon} mr-2 text-blue-200"></i>
          <span class="font-medium">${this.type}:</span>
          <span class="ml-1">${this.value} ${this.unit}</span>
        </div>
      `;
    }
  }
  
  // 5. Initialization
  document.addEventListener('DOMContentLoaded', () => {
    // Create main weather card
    const currentWeather = new WeatherCard('currentWeather');
    
    // Create forecast container
    const forecast = new ForecastCard('forecastContainer');
    
    // Example usage (will be replaced with real data)
    currentWeather.update({
      location: 'Loading...',
      date: new Date().toLocaleDateString(),
      icon: '01d',
      temp: '--',
      windSpeed: '--',
      humidity: '--',
      conditions: 'Loading weather...'
    });
    
    forecast.update([]); // Empty forecast initially
  });