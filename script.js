/**
 * Recent Searches Dropdown Styling Fixes
 * Addresses:
 * - Text visibility issues
 * - Scroll behavior
 * - Z-index layering
 * - Mobile responsiveness
 */

// 1. Update your HTML structure (if needed)
/*
<div class="relative">
  <input id="cityInput" ...>
  <div id="searchDropdown" class="hidden absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
    <!-- Dynamic content -->
    <div class="clear-search py-2 px-4 border-t border-gray-100 text-sm text-red-500 cursor-pointer">
      <i class="fas fa-trash mr-2"></i> Clear history
    </div>
  </div>
</div>
*/

// 2. CSS additions (in your <style> section)
/*
#searchDropdown {
  scrollbar-width: thin;
  scrollbar-color: #3B82F6 #E5E7EB;
}

#searchDropdown::-webkit-scrollbar {
  width: 6px;
}

#searchDropdown::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 0 0 8px 8px;
}

#searchDropdown::-webkit-scrollbar-thumb {
  background: #3B82F6;
  border-radius: 8px;
}

.search-item {
  padding: 10px 16px;
  color: #1f2937; /* gray-800 */
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-item:hover {
  background-color: #f3f4f6; /* gray-100 */
}

.search-item:active {
  background-color: #e5e7eb; /* gray-200 */
}

@media (max-width: 640px) {
  #searchDropdown {
    max-height: 50vh;
    position: fixed;
    width: calc(100% - 2rem);
    left: 1rem;
    right: 1rem;
  }
}
*/

// 3. Updated JavaScript for dropdown
function updateSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.innerHTML = '';

    if (recentSearches.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    // Add search items
    recentSearches.forEach(city => {
        const item = document.createElement('div');
        item.className = 'search-item flex items-center';
        item.innerHTML = `
            <i class="fas fa-search text-gray-400 mr-3"></i>
            <span class="truncate">${city}</span>
        `;
        
        item.addEventListener('click', () => {
            document.getElementById('cityInput').value = city;
            handleSearch();
            dropdown.classList.add('hidden');
        });
        
        dropdown.appendChild(item);
    });

    // Add clear button
    const clearBtn = document.createElement('div');
    clearBtn.className = 'clear-search flex items-center py-2 px-4 border-t border-gray-100 text-sm text-red-500 cursor-pointer';
    clearBtn.innerHTML = `
        <i class="fas fa-trash mr-2"></i>
        <span>Clear all</span>
    `;
    
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        recentSearches = [];
        localStorage.removeItem('recentSearches');
        dropdown.classList.add('hidden');
    });
    
    dropdown.appendChild(clearBtn);
}

// 4. Enhanced show/hide logic
function showSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    const input = document.getElementById('cityInput');
    
    if (recentSearches.length > 0) {
        // Position dropdown below input
        const inputRect = input.getBoundingClientRect();
        dropdown.style.width = `${inputRect.width}px`;
        dropdown.style.left = `${inputRect.left}px`;
        dropdown.style.top = `${inputRect.bottom + window.scrollY + 4}px`;
        
        dropdown.classList.remove('hidden');
        
        // Close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeDropdownHandler);
        }, 100);
    }
}

function closeDropdownHandler(e) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown.contains(e.target) && e.target.id !== 'cityInput') {
        dropdown.classList.add('hidden');
        document.removeEventListener('click', closeDropdownHandler);
    }
}

// 5. Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Update input event listener
    document.getElementById('cityInput').addEventListener('focus', () => {
        updateSearchDropdown();
        showSearchDropdown();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (!document.getElementById('searchDropdown').classList.contains('hidden')) {
            showSearchDropdown(); // Reposition on resize
        }
    });
});