export function loadPrayerTimes(city, date) {
    const cacheKey = `${city.lat}-${city.lng}-${date}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheDate = new Date(parsedData.timestamp);
        const now = new Date();
        const isCacheExpired = (now - cacheDate) > (24 * 60 * 60 * 1000);
        
        if (!isCacheExpired) {
            return Promise.resolve(parsedData.timings);
        }
    }
    
    const apiUrl = `https://api.aladhan.com/v1/timings/${date}?latitude=${city.lat}&longitude=${city.lng}&method=99&methodSettings=12.5,null,null&tune=0,0,0,0,0,0,0,90`;
    
    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            data.data.timestamp = new Date().toISOString();
            localStorage.setItem(cacheKey, JSON.stringify(data.data));
            return data.data.timings;
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
