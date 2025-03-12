export function searchCity(query, currentLanguage) {
    const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    
    return fetch(apiUrl, {
        headers: {
            'Accept-Language': currentLanguage === 'it' ? 'it' : 'ar'
        }
    })
    .then(response => response.json());
}

export function saveRecentCity(city) {
    let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
    const existingCityIndex = recentCities.findIndex(c => c.lat === city.lat && c.lng === city.lng);
    
    if (existingCityIndex !== -1) {
        recentCities.splice(existingCityIndex, 1);
    }
    
    recentCities.unshift(city);
    
    if (recentCities.length > 5) {
        recentCities = recentCities.slice(0, 5);
    }
    
    localStorage.setItem('recentCities', JSON.stringify(recentCities));
}

export function loadRecentCities() {
    return JSON.parse(localStorage.getItem('recentCities')) || [];
}
