import { translations, prayerNames } from './translations.js';
import { formatDate, padZero, loadHijriDate, convertToDateTime } from './dateUtils.js';
import { searchCity, saveRecentCity, loadRecentCities, saveLastSelectedCity, loadLastSelectedCity } from './citySearch.js';
import { loadPrayerTimes, displayPrayerTimes } from './prayerTimes.js';

let state = {
    currentCity: null,
    currentTimings: null,
    currentLanguage: 'it',
    timerInterval: null,
    nextPrayer: null,
    nextPrayerTime: null
};

function initializeApp() {
    // Elementi DOM
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
        timerElement: document.getElementById('timer'), // Aggiungi questo elemento
        recentCitiesContainer: document.createElement('div')
    };

    // Aggiungi il container delle città recenti dopo la barra di ricerca
    elements.recentCitiesContainer.className = 'recent-cities-buttons';
    elements.citySearchInput.parentElement.parentElement.appendChild(elements.recentCitiesContainer);

    // Inizializzazione
    const today = new Date();
    elements.datePicker.value = formatDate(today);
    loadHijriDate(elements.datePicker.value, state.currentLanguage);
    
    // Carica l'ultima città selezionata
    const lastCity = loadLastSelectedCity();
    if (lastCity) {
        selectCity(lastCity, elements);
    }
    
    loadRecentCities();
    updateInterface(elements);

    // Event Listeners
    setupEventListeners(elements);

    // Aggiorna i pulsanti delle città recenti
    updateRecentCitiesButtons(elements);
}

function setupEventListeners(elements) {
    // Data
    elements.datePicker.addEventListener('change', function() {
        loadHijriDate(this.value, state.currentLanguage);
        if (state.currentCity) {
            loadPrayerTimes(state.currentCity, this.value)
                .then(timings => {
                    state.currentTimings = timings;
                    displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
                    updateNextPrayer(state, elements);
                });
        }
    });

    // Pulsante Oggi
    elements.todayButton.addEventListener('click', () => {
        const todayDate = new Date();
        const formattedToday = formatDate(todayDate);
        elements.datePicker.value = formattedToday;
        loadHijriDate(formattedToday, state.currentLanguage);
        if (state.currentCity) {
            loadPrayerTimes(state.currentCity, formattedToday)
                .then(timings => {
                    state.currentTimings = timings;
                    displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
                    updateNextPrayer(state, elements);
                });
        }
    });

    // Cambio lingua
    elements.languageToggle.addEventListener('click', () => {
        toggleLanguage(elements);
    });

    // Ricerca città
    elements.searchButton.addEventListener('click', () => {
        handleCitySearch(elements);
    });

    elements.citySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCitySearch(elements);
        }
    });
}

function handleCitySearch(elements) {
    const query = elements.citySearchInput.value.trim();
    if (query.length < 3) return;

    elements.searchResults.innerHTML = `<div class="search-result-item">${translations[state.currentLanguage].searching}</div>`;
    elements.searchResults.style.display = 'block';

    searchCity(query, state.currentLanguage)
        .then(results => displaySearchResults(results, elements))
        .catch(error => {
            console.error('Errore nella ricerca:', error);
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
                nameAr: place.display_name.split(',')[0],
                lat: place.lat,
                lng: place.lon
            }, elements);
        });
        
        elements.searchResults.appendChild(resultItem);
    });
}

function selectCity(city, elements) {
    state.currentCity = city;
    updateCityName(elements);
    
    // Salva l'ultima città selezionata
    saveLastSelectedCity(city);
    
    loadPrayerTimes(city, elements.datePicker.value)
        .then(timings => {
            state.currentTimings = timings;
            displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
            updateNextPrayer(state, elements);
        });
    
    saveRecentCity(city);
    loadRecentCities();
    elements.searchResults.style.display = 'none';
    elements.citySearchInput.value = ''; // Pulisci il campo di ricerca

    // Aggiorna i pulsanti delle città recenti dopo la selezione
    updateRecentCitiesButtons(elements);
}

function updateInterface(elements) {
    elements.citySearchInput.placeholder = translations[state.currentLanguage].searchPlaceholder;
    elements.searchButton.textContent = translations[state.currentLanguage].search;
    elements.titleElement.textContent = translations[state.currentLanguage].title;
    elements.timerLabel.textContent = translations[state.currentLanguage].timer;
    elements.dateLabel.textContent = translations[state.currentLanguage].date;
    elements.todayButton.textContent = translations[state.currentLanguage].today;
    elements.languageToggle.textContent = translations[state.currentLanguage].language;
}

function toggleLanguage(elements) {
    state.currentLanguage = state.currentLanguage === 'it' ? 'ar' : 'it';
    
    document.body.classList.toggle('rtl');
    document.documentElement.setAttribute('lang', state.currentLanguage);
    document.documentElement.setAttribute('dir', state.currentLanguage === 'ar' ? 'rtl' : 'ltr');
    
    updateInterface(elements);
    updateCityName(elements);
    loadHijriDate(elements.datePicker.value, state.currentLanguage);
    
    if (state.currentTimings) {
        displayPrayerTimes(state.currentTimings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
    }
    
    loadRecentCities();
    updateNextPrayer(state, elements);

    // Aggiorna i pulsanti delle città quando si cambia lingua
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

    const now = new Date();
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayer = null;
    let nextPrayerTime = null;

    // Converti tutti gli orari delle preghiere in oggetti Date
    const prayerTimes = prayers.map(prayer => ({
        name: prayer,
        time: convertToDateTime(state.currentTimings[prayer])
    }));

    // Trova la prossima preghiera
    for (const prayer of prayerTimes) {
        if (prayer.time > now) {
            nextPrayer = prayer.name;
            nextPrayerTime = prayer.time;
            break;
        }
    }

    // Se non ci sono più preghiere oggi, prendi la prima preghiera di domani
    if (!nextPrayer) {
        nextPrayer = prayers[0];
        nextPrayerTime = convertToDateTime(state.currentTimings[prayers[0]]);
        nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
    }

    // Aggiorna lo stato
    state.nextPrayer = nextPrayer;
    state.nextPrayerTime = nextPrayerTime;

    // Aggiorna l'interfaccia
    updateTimer(nextPrayerTime, elements);
    highlightNextPrayer(nextPrayer, elements);

    // Debug - rimuovi dopo il test
    console.log('Ora corrente:', now.toLocaleTimeString());
    console.log('Prossima preghiera:', nextPrayer);
    console.log('Orario prossima preghiera:', nextPrayerTime.toLocaleTimeString());
}

function updateTimer(nextPrayerTime, elements) {
    // Pulisci il timer esistente se presente
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }

    // Funzione per aggiornare il display del timer
    function updateDisplay() {
        const now = new Date();
        const timeDiff = nextPrayerTime - now;

        if (timeDiff <= 0) {
            clearInterval(state.timerInterval);
            updateNextPrayer(state, elements);
            return;
        }

        // Calcola ore, minuti e secondi
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Aggiorna il display
        elements.timerElement.textContent = 
            `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }

    // Aggiorna immediatamente e poi ogni secondo
    updateDisplay();
    state.timerInterval = setInterval(updateDisplay, 1000);
}

function highlightNextPrayer(nextPrayer, elements) {
    // Rimuovi l'evidenziazione precedente
    const allPrayers = elements.prayerTimesContainer.querySelectorAll('.prayer-time');
    allPrayers.forEach(element => {
        element.classList.remove('next-prayer');
    });

    // Aggiungi l'evidenziazione alla prossima preghiera
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

// Inizializza l'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', initializeApp);
