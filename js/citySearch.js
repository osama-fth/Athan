export function searchCity(query, currentLanguage) {
    console.log(`Ricerca città: "${query}" [Lingua: ${currentLanguage}]`);
    const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    
    return fetch(apiUrl, {
        headers: {
            'Accept-Language': currentLanguage === 'it' ? 'it' : 'ar'
        }
    })
    .then(response => response.json())
    .then(results => {
        console.log(`Trovate ${results.length} città per la query "${query}"`);
        if (results.length > 0) {
            const firstCity = results[0];
            console.log(`Prima città trovata: ${firstCity.display_name} (${firstCity.lat}, ${firstCity.lon})`);
        }
        return results;
    })
    .catch(error => {
        console.error(`Errore durante la ricerca della città "${query}":`, error);
        throw error;
    });
}

export function saveRecentCity(city) {
    console.log(`Salvataggio città recente: ${city.name} (${city.lat}, ${city.lng})`);
    let recentCities = loadRecentCities();
    const existingCityIndex = recentCities.findIndex(c => c.lat === city.lat && c.lng === city.lng);
    
    if (existingCityIndex !== -1) {
        console.log(`Città ${city.name} già presente, aggiornamento posizione`);
        recentCities.splice(existingCityIndex, 1);
    }
    
    recentCities.unshift(city);
    
    if (recentCities.length > 5) {
        console.log(`Limite città recenti raggiunto, rimozione città meno recente`);
        recentCities = recentCities.slice(0, 5);
    }
    
    localStorage.setItem('recentCities', JSON.stringify({
        cities: recentCities,
        timestamp: new Date().toISOString()
    }));
    console.log(`${recentCities.length} città recenti salvate in cache`);
}

export function loadRecentCities() {
    console.log(`Tentativo caricamento città recenti dalla cache`);
    const stored = localStorage.getItem('recentCities');
    if (!stored) {
        console.log(`Nessuna città recente trovata in cache`);
        return [];
    }

    const data = JSON.parse(stored);
    const storedDate = new Date(data.timestamp);
    const now = new Date();

    // Verifica se è passata la mezzanotte
    if (storedDate.getDate() !== now.getDate() || 
        storedDate.getMonth() !== now.getMonth() || 
        storedDate.getFullYear() !== now.getFullYear()) {
        console.log(`Cache città recenti scaduta, pulizia in corso`);
        localStorage.removeItem('recentCities');
        return [];
    }

    console.log(`Caricate ${data.cities.length} città recenti dalla cache`);
    return data.cities || [];
}

export function saveLastSelectedCity(city) {
    console.log(`Salvataggio ultima città selezionata: ${city.name} (${city.lat}, ${city.lng})`);
    localStorage.setItem('lastSelectedCity', JSON.stringify(city));
}

export function loadLastSelectedCity() {
    console.log(`Tentativo caricamento ultima città selezionata dalla cache`);
    const savedCity = localStorage.getItem('lastSelectedCity');
    if (savedCity) {
        const city = JSON.parse(savedCity);
        console.log(`Ultima città selezionata caricata: ${city.name} (${city.lat}, ${city.lng})`);
        return city;
    }
    console.log(`Nessuna ultima città selezionata trovata`);
    return null;
}
