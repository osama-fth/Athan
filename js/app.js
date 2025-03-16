import { translations, prayerNames } from './translations.js';
import { formatDate, padZero, loadHijriDate } from './dateUtils.js';
import { searchCity, saveRecentCity, loadRecentCities, saveLastSelectedCity, loadLastSelectedCity } from './citySearch.js';
import { loadPrayerTimes, displayPrayerTimes } from './prayerTimes.js';
import { getTimezoneByCoordinates } from './timezoneService.js';

// Sistema di logging centralizzato
const logger = {
    error: (message, error) => console.error(message, error),
    warn: (message) => console.warn(message)
};

// Stato dell'applicazione
let state = {
    currentCity: null,
    currentTimings: null,
    currentLanguage: 'it',
    timerInterval: null,
    nextPrayer: null,
    nextPrayerTime: null,
    localTimeInterval: null,
    cityTimezoneOffset: 0
};

function initializeApp() {
    const elements = {
        datePicker: document.getElementById('date-picker'),
        todayButton: document.getElementById('today-btn'),
        hijriDateElement: document.getElementById('hijri-date'),
        selectedCityElement: document.getElementById('selected-city'),
        prayerTimesContainer: document.querySelector('.prayer-times'),
        languageToggle: document.getElementById('language-toggle'),
        timerLabel: document.getElementById('timer-label'),
        dateLabel: document.getElementById('date-label'),
        titleElement: document.querySelector('h1'),
        citySearchInput: document.getElementById('city-search-input'),
        searchButton: document.getElementById('search-btn'),
        searchResults: document.getElementById('search-results'),
        timerElement: document.getElementById('timer'),
        localTimeElement: document.getElementById('local-time'),
        recentCitiesContainer: document.createElement('div')
    };

    elements.recentCitiesContainer.className = 'recent-cities-buttons';
    elements.citySearchInput.parentElement.parentElement.appendChild(elements.recentCitiesContainer);

    // Inizializzazione data odierna
    const today = new Date();
    elements.datePicker.value = formatDate(today);
    
    // Caricamento data Hijri
    updateHijriDate(elements.datePicker.value, elements);
    
    // Caricamento ultima città selezionata
    const lastCity = loadLastSelectedCity();
    if (lastCity) {
        selectCity(lastCity, elements);
    }
    
    loadRecentCities();
    updateInterface(elements);
    setupRTL();
    setupEventListeners(elements);
    updateRecentCitiesButtons(elements);
}

// Funzione helper per gestire la direzione RTL in base alla lingua
function setupRTL() {
    if (state.currentLanguage === 'ar') {
        document.body.classList.add('rtl');
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    } else {
        document.body.classList.remove('rtl');
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'it');
    }
}

// Funzione per gestire le animazioni di fade
function applyFadeEffect(elements, elementsList, action, duration = 800) {
    elementsList.forEach(elementKey => {
        if (elements[elementKey]) {
            elements[elementKey].classList[action === 'add' ? 'add' : 'remove']('fade-update');
        }
    });
    
    if (action === 'add' && duration > 0) {
        setTimeout(() => {
            applyFadeEffect(elements, elementsList, 'remove');
        }, duration);
    }
}

// Funzione per aggiornare la data Hijri
function updateHijriDate(dateValue, elements) {
    return loadHijriDate(dateValue, state.currentLanguage)
        .then(hijriDate => {
            elements.hijriDateElement.textContent = hijriDate;
        })
        .catch(error => {
            logger.error('Errore nel caricamento della data Hijri:', error);
            elements.hijriDateElement.textContent = 'Data Hijri non disponibile';
        });
}

function setupEventListeners(elements) {
    // Event listener per il cambio data
    elements.datePicker.addEventListener('change', function() {
        handleDateChange(this.value, elements);
    });

    // Event listener per il pulsante "oggi"
    elements.todayButton.addEventListener('click', () => {
        const todayDate = new Date();
        const formattedToday = formatDate(todayDate);
        elements.datePicker.value = formattedToday;
        handleDateChange(formattedToday, elements);
    });
    
    // Altri event listener
    elements.languageToggle.addEventListener('click', () => {
        toggleLanguage(elements);
    });

    elements.searchButton.addEventListener('click', () => {
        handleCitySearch(elements);
    });

    elements.citySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCitySearch(elements);
        }
    });
}

// Funzione per gestire il cambio di data
function handleDateChange(dateValue, elements) {
    applyFadeEffect(elements, ['prayerTimesContainer', 'hijriDateElement'], 'add', 800);
    
    updateHijriDate(dateValue, elements);
    
    if (state.currentCity) {
        loadPrayerTimes(state.currentCity, dateValue)
            .then(timings => {
                state.currentTimings = timings;
                displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
                updateNextPrayer(state, elements);
            });
    }
}

function handleCitySearch(elements) {
    const query = elements.citySearchInput.value.trim();
    if (query.length < 3) return;

    elements.searchResults.innerHTML = `<div class="search-result-item">${translations[state.currentLanguage].searching}</div>`;
    elements.searchResults.style.display = 'block';

    searchCity(query, state.currentLanguage)
        .then(results => displaySearchResults(results, elements))
        .catch(error => {
            logger.error('Errore nella ricerca:', error);
            elements.searchResults.innerHTML = `<div class="search-result-item">${translations[state.currentLanguage].networkError}</div>`;
        });
}

function displaySearchResults(results, elements) {
    if (!results.length) {
        elements.searchResults.innerHTML = `<div class="search-result-item">${translations[state.currentLanguage].noResults}</div>`;
        return;
    }

    elements.searchResults.innerHTML = '';
    results.forEach(place => {
        const resultItem = document.createElement('div');
        resultItem.classList.add('search-result-item');
        resultItem.textContent = place.display_name;
        
        resultItem.addEventListener('click', () => {
            selectCity({
                name: place.display_name.split(',')[0],
                nameAr: place.display_name.split(',')[0], // Utilizzo lo stesso nome in assenza di traduzione
                lat: place.lat,
                lng: place.lon
            }, elements);
        });
        
        elements.searchResults.appendChild(resultItem);
    });
}

// Funzione per calcolare l'offset del fuso orario in base alla longitudine
function calculateTimezoneOffset(lng) {
    return Math.round(lng / 15) * 60 * 60 * 1000;
}

// Funzione per aggiornare l'orario locale della città
function updateLocalTime(city) {
    const localTimeElement = document.getElementById('local-time');
    
    if (!city || !city.lat || !city.lng) {
        logger.error('Città non valida o coordinate mancanti:', city);
        localTimeElement.textContent = '--:--:--';
        return null;
    }
    
    return getTimezoneByCoordinates(city.lat, city.lng)
        .then(timezone => {
            // Gestione del caso con tempo fornito dall'API
            if (timezone.time) {
                const apiTimeString = timezone.time;
                const apiTime = new Date(apiTimeString);
                
                if (!isNaN(apiTime.getTime())) {
                    state.cityTimezoneOffset = timezone.offset * 1000;
                    
                    const now = new Date();
                    const apiTimeOffset = apiTime.getTime() - now.getTime();
                    
                    return startClock(apiTimeOffset, apiTime, 'api');
                } else {
                    logger.warn("Formato data API non valido, utilizzo solo offset");
                }
            }
            
            // Fallback all'offset fornito
            return startClock(timezone.offset * 1000);
        })
        .catch(error => {
            logger.error('Fallback al calcolo approssimativo del fuso orario', error);
            const cityOffset = calculateTimezoneOffset(city.lng);
            state.cityTimezoneOffset = cityOffset;
            return startClock(cityOffset);
        });
    
    // Funzione unificata per l'avvio dell'orologio 
    function startClock(timeOffset, apiTime = null, mode = 'offset') {
        if (state.localTimeInterval) {
            clearInterval(state.localTimeInterval);
        }
        
        function updateTimeDisplay() {
            try {
                let cityTime;
                
                if (mode === 'api' && apiTime) {
                    const now = new Date();
                    const elapsedSinceApiResponse = now.getTime() - (apiTime.getTime() - timeOffset);
                    cityTime = new Date(apiTime.getTime() + elapsedSinceApiResponse);
                } else {
                    // Modalità offset standard
                    const now = new Date();
                    const localOffset = now.getTimezoneOffset() * 60 * 1000;
                    const utcTime = now.getTime() + localOffset;
                    cityTime = new Date(utcTime + timeOffset);
                }
                
                localTimeElement.textContent = cityTime.toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                return cityTime;
            } catch (error) {
                logger.error('Errore nell\'aggiornamento dell\'ora:', error);
                localTimeElement.textContent = '--:--:--';
                return null;
            }
        }
        
        updateTimeDisplay();
        state.localTimeInterval = setInterval(updateTimeDisplay, 1000);
        return state.localTimeInterval;
    }
}

function selectCity(city, elements) {
    applyFadeEffect(elements, ['prayerTimesContainer', 'hijriDateElement', 'localTimeElement'], 'add');
    
    state.currentCity = city;
    updateCityName(elements);
    
    if (state.localTimeInterval) {
        clearInterval(state.localTimeInterval);
    }
    
    state.localTimeInterval = updateLocalTime(city);
    saveLastSelectedCity(city);
    
    loadPrayerTimes(city, elements.datePicker.value)
        .then(timings => {
            state.currentTimings = timings;
            displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
            
            // Ritardo per assicurarsi che l'orario locale sia aggiornato
            setTimeout(() => {
                updateNextPrayer(state, elements);
            }, 500);
        })
        .catch(error => {
            logger.error(`Errore durante il caricamento degli orari per ${city.name}:`, error);
        });
    
    saveRecentCity(city);
    loadRecentCities();
    elements.searchResults.style.display = 'none';
    elements.citySearchInput.value = '';

    updateRecentCitiesButtons(elements);
    
    setTimeout(() => {
        applyFadeEffect(elements, ['prayerTimesContainer', 'hijriDateElement', 'localTimeElement'], 'remove');
    }, 800);
}

function updateInterface(elements) {
    const t = translations[state.currentLanguage];
    elements.citySearchInput.placeholder = t.searchPlaceholder;
    elements.searchButton.textContent = t.search;
    elements.titleElement.textContent = t.title;
    elements.timerLabel.textContent = t.timer;
    elements.dateLabel.textContent = t.date;
    elements.todayButton.textContent = t.today;
    elements.languageToggle.textContent = t.language;
}

function toggleLanguage(elements) {
    state.currentLanguage = state.currentLanguage === 'it' ? 'ar' : 'it';
    
    setupRTL();
    
    // Forzare il reflow del DOM
    void document.body.offsetHeight;
    
    updateInterface(elements);
    updateCityName(elements);
    updateHijriDate(elements.datePicker.value, elements);
    
    if (state.currentTimings) {
        displayPrayerTimes(state.currentTimings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
    }
    
    loadRecentCities();
    updateNextPrayer(state, elements);
    updateRecentCitiesButtons(elements);
}

function updateCityName(elements) {
    if (!state.currentCity) {
        elements.selectedCityElement.textContent = state.currentLanguage === 'ar' ? 'ابحث عن مدينة' : 'Cerca una città';
        return;
    }
    elements.selectedCityElement.textContent = state.currentLanguage === 'ar' ? state.currentCity.nameAr : state.currentCity.name;
}

function updateNextPrayer(state, elements) {
    if (!state.currentTimings) return;

    // Ottieni l'ora attuale della città
    const cityNow = getCurrentCityTime();
    if (!cityNow) return;
    
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayer = null;
    let nextPrayerTime = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Mappa i tempi di preghiera
    const prayerTimes = prayers.map(prayer => ({
        name: prayer,
        time: createDateFromTimeString(state.currentTimings[prayer], today)
    }));

    // Trova la prossima preghiera
    for (const prayer of prayerTimes) {
        if (prayer.time.getHours() > cityNow.getHours() || 
            (prayer.time.getHours() === cityNow.getHours() && 
             prayer.time.getMinutes() > cityNow.getMinutes())) {
            
            nextPrayer = prayer.name;
            nextPrayerTime = prayer.time;
            break;
        }
    }

    // Se non ci sono più preghiere oggi, imposta la prima preghiera di domani
    if (!nextPrayer) {
        nextPrayer = prayers[0];
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextPrayerTime = createDateFromTimeString(state.currentTimings[prayers[0]], tomorrow);
    }

    state.nextPrayer = nextPrayer;
    state.nextPrayerTime = nextPrayerTime;

    updateTimer(nextPrayerTime, elements);
    highlightNextPrayer(nextPrayer, elements);
    
    // Funzione helper per ottenere l'ora corrente della città
    function getCurrentCityTime() {
        try {
            const localTimeElement = document.getElementById('local-time');
            const timeString = localTimeElement.textContent;
            
            if (timeString === '--:--:--' || timeString.trim() === '') {
                throw new Error('Orario locale non ancora disponibile');
            }
            
            const today = new Date();
            const [hours, minutes, seconds] = timeString.split(':').map(Number);
            
            if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
                throw new Error('Formato orario non valido');
            }
            
            const cityTime = new Date(today);
            cityTime.setHours(hours, minutes, seconds, 0);
            return cityTime;
        } catch (error) {
            logger.error('Errore nel recupero dell\'ora visualizzata:', error);
            // Fallback: calcola l'ora della città dall'offset
            const now = new Date();
            const localOffset = now.getTimezoneOffset() * 60 * 1000;
            const utcTime = now.getTime() + localOffset;
            return new Date(utcTime + state.cityTimezoneOffset);
        }
    }
    
    // Funzione helper per creare un oggetto Date da una stringa di tempo
    function createDateFromTimeString(timeString, baseDate) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
}

function updateTimer(nextPrayerTime, elements) {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }

    function updateDisplay() {
        try {
            // Ottieni l'ora corrente dalla città
            const localTimeElement = document.getElementById('local-time');
            const timeString = localTimeElement.textContent;
            
            if (timeString === '--:--:--') throw new Error('Ora locale non disponibile');
            
            const [hours, minutes, seconds] = timeString.split(':').map(Number);
            const currentTime = new Date();
            currentTime.setHours(hours, minutes, seconds);
            
            // Calcola la differenza di tempo
            const timeDiff = calculateTimeDifference(currentTime, nextPrayerTime);
            
            if (timeDiff.totalSeconds <= 0) {
                clearInterval(state.timerInterval);
                updateNextPrayer(state, elements);
                return;
            }
            
            elements.timerElement.textContent = formatTime(timeDiff);
            
        } catch (error) {
            logger.error('Errore nell\'aggiornamento del timer:', error);
            elements.timerElement.textContent = '--:--:--';
        }
    }
    
    updateDisplay();
    state.timerInterval = setInterval(updateDisplay, 500);
    
    // Funzioni helper per il calcolo e la formattazione del tempo
    function calculateTimeDifference(currentTime, targetTime) {
        let totalSeconds = 0;
        
        if (targetTime.getDate() > currentTime.getDate()) {
            // Se il target è domani
            totalSeconds = (24 - currentTime.getHours()) * 3600;
            totalSeconds += targetTime.getHours() * 3600;
            totalSeconds -= currentTime.getMinutes() * 60;
            totalSeconds -= currentTime.getSeconds();
            totalSeconds += targetTime.getMinutes() * 60;
        } else {
            // Se il target è oggi
            totalSeconds = (targetTime.getHours() - currentTime.getHours()) * 3600;
            totalSeconds += (targetTime.getMinutes() - currentTime.getMinutes()) * 60;
            totalSeconds -= currentTime.getSeconds();
        }
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        return { hours, minutes, seconds, totalSeconds };
    }
    
    function formatTime({ hours, minutes, seconds }) {
        return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }
}

function highlightNextPrayer(nextPrayer, elements) {
    const allPrayers = elements.prayerTimesContainer.querySelectorAll('.prayer-time');
    allPrayers.forEach(element => {
        element.classList.remove('next-prayer');
    });

    const nextPrayerElement = Array.from(allPrayers)
        .find(element => element.dataset.prayer === nextPrayer);
    if (nextPrayerElement) {
        nextPrayerElement.classList.add('next-prayer');
    }
}

function updateRecentCitiesButtons(elements) {
    const recentCities = loadRecentCities();
    elements.recentCitiesContainer.innerHTML = '';

    recentCities.forEach(city => {
        const button = document.createElement('button');
        button.className = 'city-button';
        button.textContent = state.currentLanguage === 'ar' ? city.nameAr : city.name;
        button.addEventListener('click', () => selectCity(city, elements));
        elements.recentCitiesContainer.appendChild(button);
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
