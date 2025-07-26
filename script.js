/**
 * Temperature Unit Toggle Feature
 * Allows switching between Celsius and Fahrenheit
 * Persists user preference in localStorage
 * Updates all displayed temperatures in UI
 */

// 1. Add this to your HTML (place near weather display)
/*
<div class="unit-toggle flex justify-center mb-4">
  <button id="celsiusBtn" class="px-4 py-2 bg-blue-500 text-white rounded-l-lg font-medium">°C</button>
  <button id="fahrenheitBtn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-r-lg font-medium">°F</button>
</div>
*/

// 2. State management
let temperatureUnit = localStorage.getItem('temperatureUnit') || 'celsius';

// 3. DOM elements
const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');
const tempElements = document.querySelectorAll('[data-temp]');

// 4. Initialize toggle buttons
function initUnitToggle() {
    // Set initial active button
    updateToggleButtons();
    
    // Event listeners
    celsiusBtn.addEventListener('click', () => setTemperatureUnit('celsius'));
    fahrenheitBtn.addEventListener('click', () => setTemperatureUnit('fahrenheit'));
    
    // Apply to existing elements
    convertAllTemperatures();
}

// 5. Core conversion functions
function celsiusToFahrenheit(c) {
    return (c * 9/5) + 32;
}

function fahrenheitToCelsius(f) {
    return (f - 32) * 5/9;
}

// 6. Unit setting handler
function setTemperatureUnit(unit) {
    if (temperatureUnit === unit) return;
    
    temperatureUnit = unit;
    localStorage.setItem('temperatureUnit', unit);
    
    updateToggleButtons();
    convertAllTemperatures();
    
    console.log(`Switched to ${unit.toUpperCase()}`);
}

// 7. UI update functions
function updateToggleButtons() {
    celsiusBtn.classList.toggle('bg-blue-500', temperatureUnit === 'celsius');
    celsiusBtn.classList.toggle('text-white', temperatureUnit === 'celsius');
    celsiusBtn.classList.toggle('bg-gray-200', temperatureUnit !== 'celsius');
    celsiusBtn.classList.toggle('text-gray-800', temperatureUnit !== 'celsius');
    
    fahrenheitBtn.classList.toggle('bg-blue-500', temperatureUnit === 'fahrenheit');
    fahrenheitBtn.classList.toggle('text-white', temperatureUnit === 'fahrenheit');
    fahrenheitBtn.classList.toggle('bg-gray-200', temperatureUnit !== 'fahrenheit');
    fahrenheitBtn.classList.toggle('text-gray-800', temperatureUnit !== 'fahrenheit');
}

// 8. Temperature conversion for all elements
function convertAllTemperatures() {
    tempElements.forEach(el => {
        const baseTemp = parseFloat(el.dataset.temp);
        const displayTemp = temperatureUnit === 'celsius' 
            ? baseTemp 
            : celsiusToFahrenheit(baseTemp);
            
        el.textContent = `${displayTemp.toFixed(1)}°${temperatureUnit === 'celsius' ? 'C' : 'F'}`;
    });
}

// 9. Modified displayWeather function
function displayWeather(data) {
    // Store base temperatures in data attributes
    document.getElementById('temperature').dataset.temp = data.current.temp;
    
    // Update forecast items similarly
    document.querySelectorAll('.forecast-card').forEach((card, index) => {
        const day = data.daily[index];
        card.querySelector('.temp-display').dataset.temp = day.temp_max;
    });
    
    // Initial display
    convertAllTemperatures();
    
    // ... rest of your displayWeather function
}

// 10. Initialize on load
document.addEventListener('DOMContentLoaded', initUnitToggle);