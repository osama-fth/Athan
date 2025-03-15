import { translations, prayerNames } from './translations.js';
import { formatDate, padZero, loadHijriDate, convertToDateTime } from './dateUtils.js';
import { searchCity, saveRecentCity, loadRecentCities, saveLastSelectedCity, loadLastSelectedCity } from './citySearch.js';
import { loadPrayerTimes, displayPrayerTimes } from './prayerTimes.js';

// Aggiungi al tuo stato
let state = {
    currentCity: null,
    currentTimings: null,
    currentLanguage: 'it',
    timerInterval: null,
    nextPrayer: null,
    nextPrayerTime: null,
    localTimeInterval: null, // Per il nuovo intervallo dell'orologio locale
    cityTimezoneOffset: 0 // Per memorizzare l'offset del fuso orario
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
        localTimeElement: document.getElementById('local-time'),
        recentCitiesContainer: document.createElement('div')
    };

    // Aggiungi il container delle città recenti dopo la barra di ricerca
    elements.recentCitiesContainer.className = 'recent-cities-buttons';
    elements.citySearchInput.parentElement.parentElement.appendChild(elements.recentCitiesContainer);

    // Inizializzazione
    const today = new Date();
    elements.datePicker.value = formatDate(today);
    
    // Modifica qui: gestisci la Promise
    loadHijriDate(elements.datePicker.value, state.currentLanguage)
        .then(hijriDate => {
            elements.hijriDateElement.textContent = hijriDate;
        })
        .catch(error => {
            console.error('Errore nel caricamento della data Hijri:', error);
            elements.hijriDateElement.textContent = 'Data Hijri non disponibile';
        });
    
    // Carica l'ultima città selezionata
    const lastCity = loadLastSelectedCity();
    if (lastCity) {
        selectCity(lastCity, elements);
    }
    
    loadRecentCities();
    updateInterface(elements);

    // Assicurati che la pagina inizi con le impostazioni RTL corrette
    if (state.currentLanguage === 'ar') {
        document.body.classList.add('rtl');
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    }

    // Event Listeners
    setupEventListeners(elements);

    // Aggiorna i pulsanti delle città recenti
    updateRecentCitiesButtons(elements);
}

function setupEventListeners(elements) {
    // Data
    elements.datePicker.addEventListener('change', function() {
        // Aggiungi classe per animazione
        elements.prayerTimesContainer.classList.add('fade-update');
        elements.hijriDateElement.classList.add('fade-update');
        
        // Modifica qui: gestisci la Promise
        loadHijriDate(this.value, state.currentLanguage)
            .then(hijriDate => {
                elements.hijriDateElement.textContent = hijriDate;
            })
            .catch(error => {
                console.error('Errore nel caricamento della data Hijri:', error);
                elements.hijriDateElement.textContent = 'Data Hijri non disponibile';
            });
        
        if (state.currentCity) {
            loadPrayerTimes(state.currentCity, this.value)
                .then(timings => {
                    state.currentTimings = timings;
                    displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
                    updateNextPrayer(state, elements);
                });
        }
        
        // Rimuovi la classe dopo l'animazione
        setTimeout(() => {
            elements.prayerTimesContainer.classList.remove('fade-update');
            elements.hijriDateElement.classList.remove('fade-update');
        }, 800);
    });

    // Stesso per il pulsante Oggi
    elements.todayButton.addEventListener('click', () => {
        elements.prayerTimesContainer.classList.add('fade-update');
        elements.hijriDateElement.classList.add('fade-update');
        
        const todayDate = new Date();
        const formattedToday = formatDate(todayDate);
        elements.datePicker.value = formattedToday;
        
        // Modifica qui: gestisci la Promise
        loadHijriDate(formattedToday, state.currentLanguage)
            .then(hijriDate => {
                elements.hijriDateElement.textContent = hijriDate;
            })
            .catch(error => {
                console.error('Errore nel caricamento della data Hijri:', error);
                elements.hijriDateElement.textContent = 'Data Hijri non disponibile';
            });
        
        if (state.currentCity) {
            loadPrayerTimes(state.currentCity, formattedToday)
                .then(timings => {
                    state.currentTimings = timings;
                    displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
                    updateNextPrayer(state, elements);
                });
        }
        
        setTimeout(() => {
            elements.prayerTimesContainer.classList.remove('fade-update');
            elements.hijriDateElement.classList.remove('fade-update');
        }, 800);
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

// Aggiungi questa funzione per calcolare l'offset del fuso orario della città
function calculateTimezoneOffset(lng) {
    // Approssimazione: ogni 15° di longitudine = 1 ora
    return Math.round(lng / 15) * 60 * 60 * 1000; // Converti in millisecondi
}

// Funzione per aggiornare l'ora locale della città
function updateLocalTime(city) {
    const localTimeElement = document.getElementById('local-time');
    
    if (!city) {
        localTimeElement.textContent = '--:--:--';
        return null;
    }
    
    // Calcola l'offset del fuso orario della città
    const cityOffset = calculateTimezoneOffset(city.lng);
    state.cityTimezoneOffset = cityOffset;
    
    function updateTime() {
        const now = new Date();
        const localOffset = now.getTimezoneOffset() * 60 * 1000; // Offset locale in millisecondi
        const utcTime = now.getTime() + localOffset; // Converti in UTC
        const cityTime = new Date(utcTime + cityOffset); // Applica l'offset della città
        
        localTimeElement.textContent = cityTime.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        return cityTime; // Ritorna l'ora della città per altri utilizzi
    }
    
    // Aggiorna subito e poi ogni secondo
    updateTime();
    return setInterval(updateTime, 1000);
}

// Modifica la funzione selectCity 
function selectCity(city, elements) {
    console.log(`Selezione città: ${city.name} (${city.lat}, ${city.lng})`);
    
    // Aggiungi classe per animazione
    elements.prayerTimesContainer.classList.add('fade-update');
    elements.hijriDateElement.classList.add('fade-update');
    elements.localTimeElement.classList.add('fade-update');
    
    state.currentCity = city;
    updateCityName(elements);
    
    // Ferma il vecchio intervallo se esiste
    if (state.localTimeInterval) {
        clearInterval(state.localTimeInterval);
    }
    
    // Avvia il nuovo intervallo per l'ora locale
    state.localTimeInterval = updateLocalTime(city);
    console.log(`Intervallo orario locale impostato per ${city.name}`);
    
    // Salva l'ultima città selezionata
    saveLastSelectedCity(city);
    
    loadPrayerTimes(city, elements.datePicker.value)
        .then(timings => {
            state.currentTimings = timings;
            console.log(`Visualizzazione orari preghiera per ${city.name}`);
            displayPrayerTimes(timings, state.currentLanguage, prayerNames, elements.prayerTimesContainer);
            updateNextPrayer(state, elements);
        })
        .catch(error => {
            console.error(`Errore durante il caricamento degli orari per ${city.name}:`, error);
        });
    
    saveRecentCity(city);
    loadRecentCities();
    elements.searchResults.style.display = 'none';
    elements.citySearchInput.value = ''; // Pulisci il campo di ricerca

    // Aggiorna i pulsanti delle città recenti dopo la selezione
    updateRecentCitiesButtons(elements);
    
    // Rimuovi la classe dopo l'animazione
    setTimeout(() => {
        elements.prayerTimesContainer.classList.remove('fade-update');
        elements.hijriDateElement.classList.remove('fade-update');
        elements.localTimeElement.classList.remove('fade-update');
    }, 800);
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

// Nel tuo file app.js, funzione toggleLanguage
function toggleLanguage(elements) {
    state.currentLanguage = state.currentLanguage === 'it' ? 'ar' : 'it';
    
    if (state.currentLanguage === 'ar') {
        // Attiva RTL
        document.body.classList.add('rtl');
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    } else {
        // Disattiva RTL
        document.body.classList.remove('rtl');
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'it');
    }
    
    // Forza il reflow per applicare immediatamente i cambiamenti CSS
    void document.body.offsetHeight;
    
    updateInterface(elements);
    updateCityName(elements);
    
    // Modifica qui: gestisci la Promise
    loadHijriDate(elements.datePicker.value, state.currentLanguage)
        .then(hijriDate => {
            elements.hijriDateElement.textContent = hijriDate;
        })
        .catch(error => {
            console.error('Errore nel caricamento della data Hijri:', error);
            elements.hijriDateElement.textContent = 'Data Hijri non disponibile';
        });
    
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

// Modifica la funzione updateNextPrayer per usare l'ora locale della città
function updateNextPrayer(state, elements) {
    if (!state.currentTimings) return;

    // Usa l'ora locale della città invece dell'ora del dispositivo
    const now = new Date();
    const localOffset = now.getTimezoneOffset() * 60 * 1000;
    const utcTime = now.getTime() + localOffset;
    const cityNow = new Date(utcTime + state.cityTimezoneOffset);
    
    console.log(`Calcolo prossima preghiera - Ora città: ${cityNow.toLocaleTimeString()}`);
    
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayer = null;
    let nextPrayerTime = null;

    // Converti tutti gli orari delle preghiere in oggetti Date
    const prayerTimes = prayers.map(prayer => {
        const prayerTimeObj = convertToDateTime(state.currentTimings[prayer]);
        return {
            name: prayer,
            time: prayerTimeObj
        };
    });

    // Trova la prossima preghiera usando l'ora locale della città
    for (const prayer of prayerTimes) {
        if (prayer.time > cityNow) {
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
        console.log(`Nessuna altra preghiera oggi, impostata la prima preghiera di domani: ${nextPrayer}`);
    } else {
        console.log(`Prossima preghiera: ${nextPrayer} alle ${nextPrayerTime.toLocaleTimeString()}`);
    }

    // Aggiorna lo stato
    state.nextPrayer = nextPrayer;
    state.nextPrayerTime = nextPrayerTime;

    // Aggiorna l'interfaccia
    updateTimer(nextPrayerTime, elements);
    highlightNextPrayer(nextPrayer, elements);
}

// Modifica la funzione updateTimer per usare l'ora locale della città
function updateTimer(nextPrayerTime, elements) {
    // Pulisci il timer esistente se presente
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }

    // Funzione per aggiornare il display del timer
    function updateDisplay() {
        // Usa l'ora locale della città invece dell'ora del dispositivo
        const now = new Date();
        const localOffset = now.getTimezoneOffset() * 60 * 1000;
        const utcTime = now.getTime() + localOffset;
        const cityNow = new Date(utcTime + state.cityTimezoneOffset);
        
        const timeDiff = nextPrayerTime - cityNow;

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
