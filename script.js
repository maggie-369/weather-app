/**
 * iPhone SE (375x667) Responsive Enhancements
 * Focuses on viewport-specific fixes for:
 * - Layout restructuring
 * - Font size adjustments
 * - Touch target sizing
 * - Forecast card scrolling
 */

// 1. Add this CSS media query (in your <style> section)
/*
@media (max-width: 375px) { /* iPhone SE specific */
  /* Base font scaling */
  html { font-size: 14px; }
  
  /* Search bar adjustments */
  #cityInput {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  
  /* Current weather card */
  .weather-card {
    flex-direction: column;
    padding: 1.25rem;
  }
  
  /* Forecast horizontal scrolling */
  .forecast-container {
    padding-bottom: 0.5rem;
    scroll-snap-type: x mandatory;
  }
  
  .forecast-card {
    min-width: 140px;
    scroll-snap-align: start;
    margin-right: 0.75rem;
  }
  
  /* Button tap targets */
  button, [role="button"] {
    min-height: 44px; /* Apple recommended minimum */
    min-width: 44px;
  }
  
  /* Spacing adjustments */
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
*/

// 2. Add this JavaScript viewport detection (in your main script)
function optimizeForIPhoneSE() {
    const isIPhoneSE = window.matchMedia('(max-width: 375px) and (max-height: 667px)').matches;
    
    if (isIPhoneSE) {
        console.log('Applying iPhone SE optimizations');
        
        // 1. Adjust forecast container for horizontal scrolling
        const forecastContainer = document.getElementById('forecastContainer');
        forecastContainer.classList.add('overflow-x-auto', 'whitespace-nowrap');
        forecastContainer.classList.remove('flex-wrap');
        
        // 2. Make forecast cards inline-block
        document.querySelectorAll('.forecast-card').forEach(card => {
            card.classList.add('inline-block', 'align-top');
            card.classList.remove('flex-shrink-0');
        });
        
        // 3. Add touch-friendly padding
        document.querySelectorAll('button').forEach(btn => {
            btn.classList.add('py-3');
        });
    }
}

// 3. Update your displayForecast function
function displayForecast(dailyForecast) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';
    
    dailyForecast.forEach(day => {
        const forecastCard = document.createElement('div');
        forecastCard.className = window.innerWidth <= 375 
            ? 'forecast-card inline-block align-top w-[140px] mr-3 p-3 rounded-xl bg-white/20' 
            : 'forecast-card flex-shrink-0 rounded-xl p-4 w-full sm:w-48 text-center';
        
        // ... rest of your forecast card content
    });
}

// 4. Initialize on load and resize
document.addEventListener('DOMContentLoaded', optimizeForIPhoneSE);
window.addEventListener('resize', optimizeForIPhoneSE);