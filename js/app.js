import { translations, prayerNames } from './translations.js';
import { formatDate, padZero, loadHijriDate} from './dateUtils.js';
import { searchCity, saveRecentCity, loadRecentCities, saveLastSelectedCity, loadLastSelectedCity } from './citySearch.js';
import { loadPrayerTimes, displayPrayerTimes } from './prayerTimes.js';
import { getTimezoneByCoordinates } from './timezoneService.js';

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

    const today = new Date();
    elements.datePicker.value = formatDate(today);
    
    loadHijriDate(elements.datePicker.value, state.currentLanguage)
        .then(hijriDate => {
            elements.hijriDateElement.textContent = hijriDate;
        })
        .catch(error => {
            console.error('Errore nel caricamento della data Hijri:', error);
            elements.hijriDateElement.textContent = 'Data Hijri non disponibile';
        });
    
    const lastCity = loadLastSelectedCity();
    if (lastCity) {
        selectCity(lastCity, elements);
    }
    
    loadRecentCities();
    updateInterface(elements);

    if (state.currentLanguage === 'ar') {
        document.body.classList.add('rtl');
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    }

    setupEventListeners(elements);
    updateRecentCitiesButtons(elements);
}

function setupEventListeners(elements) {
    elements.datePicker.addEventListener('change', function() {
        elements.prayerTimesContainer.classList.add('fade-update');
        elements.hijriDateElement.classList.add('fade-update');
        
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
        
        setTimeout(() => {
            elements.prayerTimesContainer.classList.remove('fade-update');
            elements.hijriDateElement.classList.remove('fade-update');
        }, 800);
    });

    elements.todayButton.addEventListener('click', () => {
        elements.prayerTimesContainer.classList.add('fade-update');
        elements.hijriDateElement.classList.add('fade-update');
        
        const todayDate = new Date();
        const formattedToday = formatDate(todayDate);
        elements.datePicker.value = formattedToday;
        
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

function calculateTimezoneOffset(lng) {
    return Math.round(lng / 15) * 60 * 60 * 1000;
}

function updateLocalTime(city) {
    const localTimeElement = document.getElementById('local-time');
    
    if (!city || !city.lat || !city.lng) {
        console.error('Città non valida o coordinate mancanti:', city);
        localTimeElement.textContent = '--:--:--';
        return null;
    }
    
    getTimezoneByCoordinates(city.lat, city.lng)
        .then(timezone => {
            if (timezone.time) {
                const apiTimeString = timezone.time;
                const apiTime = new Date(apiTimeString);
                
                if (!isNaN(apiTime.getTime())) {
                    state.cityTimezoneOffset = timezone.offset * 1000;
                    
                    const now = new Date();
                    const apiTimeOffset = apiTime.getTime() - now.getTime();
                    
                    return startClockWithAPITime(apiTimeOffset, apiTime);
                } else {
                    console.warn("Formato data API non valido, utilizzo solo offset");
                }
            }
            
            return startClockWithOffset(timezone.offset * 1000);
        })
        .catch(error => {
            console.error('Fallback al calcolo approssimativo del fuso orario', error);
            const cityOffset = calculateTimezoneOffset(city.lng);
            state.cityTimezoneOffset = cityOffset;
            return startClockWithOffset(cityOffset);
        });
    
    function startClockWithAPITime(apiTimeOffset, apiTime) {
        if (state.localTimeInterval) {
            clearInterval(state.localTimeInterval);
        }
        
        function updateTimeDisplay() {
            try {
                const now = new Date();
                const elapsedSinceApiResponse = now.getTime() - (apiTime.getTime() - apiTimeOffset);
                const currentCityTime = new Date(apiTime.getTime() + elapsedSinceApiResponse);
                
                localTimeElement.textContent = currentCityTime.toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                return currentCityTime;
            } catch (error) {
                console.error('Errore nell\'aggiornamento dell\'ora:', error);
                localTimeElement.textContent = '--:--:--';
                return null;
            }
        }
        
        updateTimeDisplay();
        state.localTimeInterval = setInterval(updateTimeDisplay, 1000);
        return state.localTimeInterval;
    }
    
    function startClockWithOffset(cityOffset) {
        if (state.localTimeInterval) {
            clearInterval(state.localTimeInterval);
        }
        
        function updateTimeDisplay() {
            try {
                const now = new Date();
                const localOffset = now.getTimezoneOffset() * 60 * 1000;
                const utcTime = now.getTime() + localOffset;
                const cityTime = new Date(utcTime + cityOffset);
                
                localTimeElement.textContent = cityTime.toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                return cityTime;
            } catch (error) {
                console.error('Errore nell\'aggiornamento dell\'ora:', error);
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
    elements.prayerTimesContainer.classList.add('fade-update');
    elements.hijriDateElement.classList.add('fade-update');
    elements.localTimeElement.classList.add('fade-update');
    
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
            
            // Aggiungi un ritardo per assicurarti che l'orario locale sia aggiornato prima di calcolare la preghiera successiva
            setTimeout(() => {
                updateNextPrayer(state, elements);
            }, 500);
        })
        .catch(error => {
            console.error(`Errore durante il caricamento degli orari per ${city.name}:`, error);
        });
    
    saveRecentCity(city);
    loadRecentCities();
    elements.searchResults.style.display = 'none';
    elements.citySearchInput.value = '';

    updateRecentCitiesButtons(elements);
    
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

function toggleLanguage(elements) {
    state.currentLanguage = state.currentLanguage === 'it' ? 'ar' : 'it';
    
    if (state.currentLanguage === 'ar') {
        document.body.classList.add('rtl');
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
    } else {
        document.body.classList.remove('rtl');
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'it');
    }
    
    void document.body.offsetHeight;
    
    updateInterface(elements);
    updateCityName(elements);
    
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

    let cityNow;
    
    try {
        const localTimeElement = document.getElementById('local-time');
        const timeString = localTimeElement.textContent;
        
        const today = new Date();
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        
        cityNow = new Date(today);
        cityNow.setHours(hours, minutes, seconds, 0);
    } catch (error) {
        console.error('Errore nel recupero dell\'ora visualizzata:', error);
        const now = new Date();
        const localOffset = now.getTimezoneOffset() * 60 * 1000;
        const utcTime = now.getTime() + localOffset;
        cityNow = new Date(utcTime + state.cityTimezoneOffset);
    }
    
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayer = null;
    let nextPrayerTime = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const prayerTimes = prayers.map(prayer => {
        const timeString = state.currentTimings[prayer];
        const [hours, minutes] = timeString.split(':').map(Number);
        const prayerDate = new Date(today);
        prayerDate.setHours(hours, minutes, 0, 0);
        
        return {
            name: prayer,
            time: prayerDate
        };
    });

    for (const prayer of prayerTimes) {
        if (prayer.time.getHours() > cityNow.getHours() || 
            (prayer.time.getHours() === cityNow.getHours() && 
             prayer.time.getMinutes() > cityNow.getMinutes())) {
            
            nextPrayer = prayer.name;
            nextPrayerTime = prayer.time;
            break;
        }
    }

    if (!nextPrayer) {
        nextPrayer = prayers[0];
        const tomorrowPrayerTime = new Date(today);
        tomorrowPrayerTime.setDate(tomorrowPrayerTime.getDate() + 1);
        
        const [hours, minutes] = state.currentTimings[prayers[0]].split(':').map(Number);
        tomorrowPrayerTime.setHours(hours, minutes, 0, 0);
        nextPrayerTime = tomorrowPrayerTime;
    }

    state.nextPrayer = nextPrayer;
    state.nextPrayerTime = nextPrayerTime;

    updateTimerSimple(nextPrayerTime, cityNow, elements);
    highlightNextPrayer(nextPrayer, elements);
}

function updateTimerSimple(nextPrayerTime, currentCityTime, elements) {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }

    function updateDisplay() {
        try {
            const localTimeElement = document.getElementById('local-time');
            const timeString = localTimeElement.textContent;
            
            const [hours, minutes, seconds] = timeString.split(':').map(Number);
            
            let totalSecondsToNext = 0;
            
            if (nextPrayerTime.getDate() > currentCityTime.getDate()) {
                totalSecondsToNext += (24 - hours) * 3600;
                totalSecondsToNext += nextPrayerTime.getHours() * 3600;
                totalSecondsToNext -= minutes * 60;
                totalSecondsToNext -= seconds;
                totalSecondsToNext += nextPrayerTime.getMinutes() * 60;
            } else {
                totalSecondsToNext = (nextPrayerTime.getHours() - hours) * 3600;
                totalSecondsToNext += (nextPrayerTime.getMinutes() - minutes) * 60;
                totalSecondsToNext -= seconds;
            }
            
            const remainingHours = Math.floor(totalSecondsToNext / 3600);
            const remainingMinutes = Math.floor((totalSecondsToNext % 3600) / 60);
            const remainingSeconds = Math.floor(totalSecondsToNext % 60);
            
            elements.timerElement.textContent = 
                `${padZero(remainingHours)}:${padZero(remainingMinutes)}:${padZero(remainingSeconds)}`;
            
            if (totalSecondsToNext <= 0) {
                clearInterval(state.timerInterval);
                updateNextPrayer(state, elements);
                return;
            }
        } catch (error) {
            console.error('Errore nell\'aggiornamento del timer:', error);
            elements.timerElement.textContent = '--:--:--';
        }
    }

    updateDisplay();
    state.timerInterval = setInterval(updateDisplay, 500);
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
