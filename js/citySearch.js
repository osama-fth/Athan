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
    let recentCities = loadRecentCities();
    const existingCityIndex = recentCities.findIndex(c => c.lat === city.lat && c.lng === city.lng);
    
    if (existingCityIndex !== -1) {
        recentCities.splice(existingCityIndex, 1);
    }
    
    recentCities.unshift(city);
    
    if (recentCities.length > 5) {
        recentCities = recentCities.slice(0, 5);
    }
    
    localStorage.setItem('recentCities', JSON.stringify({
        cities: recentCities,
        timestamp: new Date().toISOString()
    }));
}

export function loadRecentCities() {
    const stored = localStorage.getItem('recentCities');
    if (!stored) return [];

    const data = JSON.parse(stored);
    const storedDate = new Date(data.timestamp);
    const now = new Date();

    // Verifica se è passata la mezzanotte
    if (storedDate.getDate() !== now.getDate() || 
        storedDate.getMonth() !== now.getMonth() || 
        storedDate.getFullYear() !== now.getFullYear()) {
        localStorage.removeItem('recentCities');
        return [];
    }

    return data.cities || [];
}

export function saveLastSelectedCity(city) {
    localStorage.setItem('lastSelectedCity', JSON.stringify(city));
}

export function loadLastSelectedCity() {
    const savedCity = localStorage.getItem('lastSelectedCity');
    return savedCity ? JSON.parse(savedCity) : null;
}
