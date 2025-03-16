let timezoneData = null;
let timezoneDataLoading = null;
let timezoneCache = {};

/**
 * Carica i dati di timezone in modo asincrono
 */
export function loadTimezoneData() {
    if (timezoneData !== null) {
        return Promise.resolve(timezoneData);
    }
    
    if (timezoneDataLoading !== null) {
        return timezoneDataLoading;
    }
    
    timezoneDataLoading = fetch('data/timezones.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore nel caricamento dei dati di timezone');
            }
            return response.json();
        })
        .then(data => {
            timezoneData = data;
            console.log(`Dati di timezone caricati: ${Object.keys(timezoneData).length} zone`);
            return timezoneData;
        })
        .catch(error => {
            console.error('Impossibile caricare i dati di timezone:', error);
            // Fallback alla funzione di approssimazione esistente
            timezoneData = {};
            return timezoneData;
        });
    
    return timezoneDataLoading;
}

/**
 * Trova il fuso orario in base alle coordinate usando un'API online
 * @param {number} lat - Latitudine
 * @param {number} lng - Longitudine
 * @returns {Promise<Object>} Informazioni sul fuso orario
 */
// Modifica la funzione per includere il campo time nella risposta
export function getTimezoneByCoordinates(lat, lng) {
    // Verifico la validità dei parametri
    if (!lat || !lng) {
        console.error('Coordinate non valide:', lat, lng);
        return Promise.reject(new Error('Coordinate non valide'));
    }
    
    // Arrotonda le coordinate a 1 decimale per migliorare la cache
    const roundedLat = Math.round(parseFloat(lat) * 10) / 10;
    const roundedLng = Math.round(parseFloat(lng) * 10) / 10;
    const cacheKey = `${roundedLat},${roundedLng}`;
    
    // Verifica se abbiamo già questa posizione in cache
    if (timezoneCache[cacheKey]) {
        console.log('Fuso orario recuperato dalla cache');
        return Promise.resolve(timezoneCache[cacheKey]);
    }
    
    // Usa l'API GeoNames
    const url = `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lng}&username=osama_fth`;
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore nella richiesta del fuso orario');
            }
            return response.json();
        })
        .then(data => {
            // Verifico che la risposta contenga i campi necessari
            if (!data || typeof data.rawOffset === 'undefined') {
                throw new Error('Risposta API non valida');
            }
            
            // Converti in un formato coerente
            const timezoneData = {
                offset: parseInt(data.rawOffset * 3600), // Converti in secondi
                zoneName: data.timezoneId || 'Unknown',
                dst: data.dstOffset > 0 ? 1 : 0,
                // Aggiungi l'ora locale fornita dall'API
                time: data.time || null
            };
            
            console.log('Timezone API response:', data);
            console.log('Calculated offset:', timezoneData.offset);
            
            // Salva in cache
            timezoneCache[cacheKey] = timezoneData;
            
            return timezoneData;
        })
        .catch(error => {
            console.error('Errore nel servizio timezone:', error);
            // Fallback al calcolo approssimativo
            const fallbackOffset = Math.round(lng / 15) * 60 * 60;
            return {
                offset: fallbackOffset,  // Secondi
                zoneName: 'Approximated',
                dst: 0,
                time: null
            };
        });
}
