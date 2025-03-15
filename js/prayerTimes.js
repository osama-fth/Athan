export function loadPrayerTimes(city, date) {
    console.log(`Tentativo di caricamento orari preghiera per: ${city.name} (${city.lat}, ${city.lng}) - Data: ${date}`);
    const cacheKey = `prayerTimes-${city.lat}-${city.lng}-${date}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheDate = new Date(parsedData.timestamp);
        const now = new Date();
        
        // Verifica se è passata la mezzanotte
        if (cacheDate.getDate() === now.getDate() && 
            cacheDate.getMonth() === now.getMonth() && 
            cacheDate.getFullYear() === now.getFullYear()) {
            console.log(`Orari preghiera caricati dalla cache per ${city.name} - Data: ${date}`);
            return Promise.resolve(parsedData.timings);
        } else {
            console.log(`Cache scaduta per ${city.name} - Data: ${date}. Rimozione...`);
            localStorage.removeItem(cacheKey);
        }
    }
    
    const apiUrl = `https://api.aladhan.com/v1/timings/${date}?latitude=${city.lat}&longitude=${city.lng}&method=99&methodSettings=12.5,null,null&tune=0,0,0,0,0,0,0,90`;
    console.log(`Richiesta API per orari preghiera: ${apiUrl}`);
    
    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const cacheData = {
                timings: data.data.timings,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log(`Orari preghiera ottenuti da API e salvati in cache per ${city.name}`);
            return data.data.timings;
        })
        .catch(error => {
            console.error(`Errore durante il caricamento degli orari per ${city.name}:`, error);
            throw error;
        });
}

export function displayPrayerTimes(timings, currentLanguage, prayerNames, container) {
    container.innerHTML = '';
    const relevantPrayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    relevantPrayers.forEach(prayer => {
        const time = timings[prayer];
        const prayerElement = document.createElement('div');
        prayerElement.classList.add('prayer-time');
        prayerElement.dataset.time = time;
        prayerElement.dataset.prayer = prayer;

        if (currentLanguage === 'ar') {
            prayerElement.innerHTML = `
                <span class="prayer-time-value">${time}</span>
                <span class="prayer-name">${prayerNames[currentLanguage][prayer]}</span>
            `;
        } else {
            prayerElement.innerHTML = `
                <span class="prayer-name">${prayerNames[currentLanguage][prayer]}</span>
                <span class="prayer-time-value">${time}</span>
            `;
        }

        container.appendChild(prayerElement);
    });
}
