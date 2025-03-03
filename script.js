document.addEventListener('DOMContentLoaded', function() {
    // Traduzioni delle stringhe dell'interfaccia
    const translations = {
        'it': {
            'title': 'Orari delle Preghiere',
            'timer': 'Tempo rimanente per la prossima preghiera:',
            'date': 'Seleziona data:',
            'today': 'Oggi',
            'language': 'العربية',
            'searchPlaceholder': 'Cerca una città...',
            'search': 'Cerca',
            'noResults': 'Nessun risultato trovato',
            'searching': 'Ricerca in corso...',
            'networkError': 'Errore di rete. Riprova più tardi.',
            'recentCities': 'Città recenti:',
            'prayerTimesError': 'Errore nel caricamento degli orari. Riprova più tardi.'
        },
        'ar': {
            'title': 'أوقات الصلاة',
            'timer': 'الوقت المتبقي للصلاة القادمة:',
            'date': 'اختر التاريخ:',
            'today': 'اليوم',
            'language': 'Italiano',
            'searchPlaceholder': 'ابحث عن مدينة...',
            'search': 'بحث',
            'noResults': 'لم يتم العثور على نتائج',
            'searching': 'جاري البحث...',
            'networkError': 'خطأ في الشبكة. حاول مرة أخرى لاحقًا.',
            'recentCities': 'المدن الأخيرة:',
            'prayerTimesError': 'خطأ في تحميل أوقات الصلاة. حاول مرة أخرى لاحقًا.'
        }
    };
    
    // Nomi delle preghiere in italiano e arabo
    const prayerNames = {
        'it': {
            'Fajr': 'Fajr',
            'Sunrise': 'Alba',
            'Dhuhr': 'Dhuhr',
            'Asr': 'Asr',
            'Maghrib': 'Maghrib',
            'Isha': 'Isha'
        },
        'ar': {
            'Fajr': 'الفجر',
            'Sunrise': 'الشروق',
            'Dhuhr': 'الظهر',
            'Asr': 'العصر',
            'Maghrib': 'المغرب',
            'Isha': 'العشاء'
        }
    };
    
    // Elementi DOM
    const datePicker = document.getElementById('date-picker');
    const todayButton = document.getElementById('today-btn');
    const hijriDateElement = document.getElementById('hijri-date');
    const selectedCityElement = document.getElementById('selected-city');
    const prayerTimesContainer = document.querySelector('.prayer-times');
    const languageToggle = document.getElementById('language-toggle');
    const timerLabel = document.getElementById('timer-label');
    const dateLabel = document.getElementById('date-label');
    const titleElement = document.querySelector('h1');
    const citySearchInput = document.getElementById('city-search-input');
    const searchButton = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    
    // Stato dell'applicazione
    let currentCity = null;
    let currentTimings = null;
    let currentLanguage = 'it';
    
    // Imposta la data di oggi come valore predefinito
    const today = new Date();
    const formattedDate = formatDate(today);
    datePicker.value = formattedDate;
    
    // Carica la data islamica
    loadHijriDate(formattedDate);
    
    // Visualizza città recenti se disponibili
    loadRecentCities();
    
    // Imposta placeholder della ricerca
    citySearchInput.placeholder = translations[currentLanguage].searchPlaceholder;
    searchButton.textContent = translations[currentLanguage].search;
    
    // Event listener per il cambio di data
    datePicker.addEventListener('change', function() {
        loadHijriDate(this.value);
        if (currentCity) {
            loadPrayerTimes(currentCity, this.value);
        }
    });
    
    // Event listener per il pulsante "Oggi"
    todayButton.addEventListener('click', function() {
        const todayDate = new Date();
        const formattedToday = formatDate(todayDate);
        datePicker.value = formattedToday;
        loadHijriDate(formattedToday);
        if (currentCity) {
            loadPrayerTimes(currentCity, formattedToday);
        }
    });
    
    // Event listener per il cambio lingua
    languageToggle.addEventListener('click', function() {
        toggleLanguage();
    });
    
    // Event listener per il pulsante di ricerca
    searchButton.addEventListener('click', function() {
        searchCity();
    });
    
    // Event listener per l'input di ricerca (ricerca su invio)
    citySearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchCity();
        }
    });
    
    // Funzione per cercare una città
    function searchCity() {
        const searchQuery = citySearchInput.value.trim();
        
        if (searchQuery.length < 3) {
            return;
        }
        
        // Mostra il risultato della ricerca
        searchResults.innerHTML = `<div class="search-result-item">${translations[currentLanguage].searching}</div>`;
        searchResults.style.display = 'block';
        
        // Utilizziamo l'API di Nominatim per cercare la città
        const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`;
        
        fetch(apiUrl, {
            headers: {
                'Accept-Language': currentLanguage === 'it' ? 'it' : 'ar'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                // Visualizza i risultati
                searchResults.innerHTML = '';
                
                data.forEach(place => {
                    const resultItem = document.createElement('div');
                    resultItem.classList.add('search-result-item');
                    resultItem.textContent = place.display_name;
                    
                    resultItem.addEventListener('click', function() {
                        // Seleziona la città e carica gli orari
                        selectCity({
                            name: place.display_name.split(',')[0],
                            nameAr: place.display_name.split(',')[0], // Utilizziamo lo stesso nome per ora
                            lat: place.lat,
                            lng: place.lon
                        });
                        
                        // Nascondi i risultati
                        searchResults.style.display = 'none';
                    });
                    
                    searchResults.appendChild(resultItem);
                });
            } else {
                searchResults.innerHTML = `<div class="search-result-item">${translations[currentLanguage].noResults}</div>`;
            }
        })
        .catch(error => {
            console.error('Errore nella ricerca:', error);
            searchResults.innerHTML = `<div class="search-result-item">${translations[currentLanguage].networkError}</div>`;
        });
    }
    
    // Funzione per selezionare una città
    function selectCity(city) {
        currentCity = city;
        
        // Aggiorna il nome della città visualizzato
        updateCityName();
        
        // Carica gli orari di preghiera
        loadPrayerTimes(currentCity, datePicker.value);
        
        // Salva la città nelle recenti
        saveRecentCity(city);
        
        // Mostra le città recenti aggiornate
        loadRecentCities();
    }
    
    // Funzione per salvare una città recente
    function saveRecentCity(city) {
        let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
        
        // Verifica se la città è già presente
        const existingCityIndex = recentCities.findIndex(c => c.lat === city.lat && c.lng === city.lng);
        
        if (existingCityIndex !== -1) {
            // Rimuovi la città esistente
            recentCities.splice(existingCityIndex, 1);
        }
        
        // Aggiungi la nuova città all'inizio
        recentCities.unshift(city);
        
        // Limita a massimo 5 città recenti
        if (recentCities.length > 5) {
            recentCities = recentCities.slice(0, 5);
        }
        
        // Salva le città recenti
        localStorage.setItem('recentCities', JSON.stringify(recentCities));
    }
    
    // Funzione per caricare le città recenti
    function loadRecentCities() {
        const recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
        
        // Rimuovi il contenitore precedente se esiste
        const existingContainer = document.querySelector('.recent-cities');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Se non ci sono città recenti, esci
        if (recentCities.length === 0) {
            return;
        }
        
        // Crea il contenitore per le città recenti
        const recentCitiesContainer = document.createElement('div');
        recentCitiesContainer.classList.add('recent-cities');
        
        // Aggiungi il titolo
        const title = document.createElement('div');
        title.classList.add('recent-cities-title');
        title.textContent = translations[currentLanguage].recentCities;
        recentCitiesContainer.appendChild(title);
        
        // Crea la lista di città recenti
        const citiesList = document.createElement('div');
        citiesList.classList.add('recent-cities-list');
        
        recentCities.forEach(city => {
            const cityTag = document.createElement('div');
            cityTag.classList.add('recent-city-tag');
            cityTag.textContent = currentLanguage === 'ar' ? city.nameAr : city.name;
            
            cityTag.addEventListener('click', function() {
                selectCity(city);
            });
            
            citiesList.appendChild(cityTag);
        });
        
        recentCitiesContainer.appendChild(citiesList);
        
        // Inserisci il contenitore dopo la barra di ricerca
        const citySearch = document.querySelector('.city-search');
        citySearch.appendChild(recentCitiesContainer);
    }
    
    // Funzione per cambiare lingua
    function toggleLanguage() {
        currentLanguage = currentLanguage === 'it' ? 'ar' : 'it';
        
        // Aggiorna direzione del testo e classi RTL
        if (currentLanguage === 'ar') {
            document.body.classList.add('rtl');
            document.documentElement.setAttribute('lang', 'ar');
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.body.classList.remove('rtl');
            document.documentElement.setAttribute('lang', 'it');
            document.documentElement.setAttribute('dir', 'ltr');
        }
        
        // Aggiorna le traduzioni dell'interfaccia
        titleElement.textContent = translations[currentLanguage].title;
        timerLabel.textContent = translations[currentLanguage].timer;
        dateLabel.textContent = translations[currentLanguage].date;
        todayButton.textContent = translations[currentLanguage].today;
        languageToggle.textContent = translations[currentLanguage].language;
        citySearchInput.placeholder = translations[currentLanguage].searchPlaceholder;
        searchButton.textContent = translations[currentLanguage].search;
        
        // Aggiorna il nome della città
        updateCityName();
        
        // Aggiorna la data islamica
        loadHijriDate(datePicker.value);
        
        // Se abbiamo già caricato gli orari, li aggiorniamo con i nuovi nomi
        if (currentTimings) {
            displayPrayerTimes(currentTimings);
        }
        
        // Aggiorna la lista delle città recenti
        loadRecentCities();
        
        updateNextPrayer();
    }
    
    // Funzione per aggiornare il nome della città in base alla lingua
    function updateCityName() {
        if (!currentCity) {
            selectedCityElement.textContent = currentLanguage === 'ar' ? 'ابحث عن مدينة' : 'Cerca una città';
            return;
        }
        
        if (currentLanguage === 'ar') {
            selectedCityElement.textContent = currentCity.nameAr;
        } else {
            selectedCityElement.textContent = currentCity.name;
        }
    }
    
    // Funzione per caricare la data islamica
    function loadHijriDate(gregorianDate) {
        const [year, month, day] = gregorianDate.split('-');
        
        // Utilizziamo l'API aladhan.com per ottenere la data islamica
        const apiUrl = `https://api.aladhan.com/v1/gToH/${day}-${month}-${year}`;
        
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.code === 200 && data.data) {
                    const hijri = data.data.hijri;
                    if (currentLanguage === 'ar') {
                        hijriDateElement.textContent = `${hijri.day} ${hijri.month.ar} ${hijri.year}`;
                    } else {
                        hijriDateElement.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year}`;
                    }
                } else {
                    hijriDateElement.textContent = currentLanguage === 'ar' ? 
                        'التاريخ الإسلامي غير متاح' : 
                        'Data islamica non disponibile';
                }
            })
            .catch(error => {
                console.error('Errore nel caricamento della data islamica:', error);
                hijriDateElement.textContent = currentLanguage === 'ar' ? 
                    'خطأ في تحميل التاريخ الإسلامي' : 
                    'Errore nel caricamento della data islamica';
            });
    }
    
    // Funzione per caricare gli orari di preghiera
    function loadPrayerTimes(city, date) {
        const cacheKey = `${city.lat}-${city.lng}-${date}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const cacheDate = new Date(parsedData.timestamp);
            const now = new Date();
            
            // Controlliamo se la cache è scaduta (es. 24 ore)
            const isCacheExpired = (now - cacheDate) > (24 * 60 * 60 * 1000);  // 24 ore
            
            if (!isCacheExpired) {
                console.log("Orari letti dalla cache");
                currentTimings = parsedData.timings;
                displayPrayerTimes(currentTimings);
                updateNextPrayer();
                return;
            }
        }
        
        // Se i dati sono scaduti o non esistono nella cache, facciamo la richiesta all'API
        const apiUrl = `https://api.aladhan.com/v1/timings/${date}?latitude=${city.lat}&longitude=${city.lng}&method=12&isha=90`;
        
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                // Aggiungiamo un timestamp per verificare la scadenza
                data.data.timestamp = new Date().toISOString();
                localStorage.setItem(cacheKey, JSON.stringify(data.data));
                
                currentTimings = data.data.timings;
                displayPrayerTimes(currentTimings);
                updateNextPrayer();
            })
            .catch(error => {
                console.error(`Errore nel caricamento degli orari:`, error);
                const errorMessage = currentLanguage === 'ar' ? 
                    '<p class="error">خطأ في تحميل أوقات الصلاة. حاول مرة أخرى لاحقًا.</p>' : 
                    '<p class="error">Errore nel caricamento degli orari. Riprova più tardi.</p>';
                prayerTimesContainer.innerHTML = errorMessage;
            });
    }
    
    function displayPrayerTimes(timings) {
        // Svuota il contenitore della tabella prima di inserire i nuovi dati
        prayerTimesContainer.innerHTML = '';
    
        // Filtriamo solo le preghiere che ci interessano
        const relevantPrayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
        relevantPrayers.forEach(prayer => {
            const time = timings[prayer];
            const prayerElement = document.createElement('div');
            prayerElement.classList.add('prayer-time');
            prayerElement.dataset.time = time;
            prayerElement.dataset.prayer = prayer;
    
            // Creiamo l'HTML per la tabella in base alla lingua
            if (currentLanguage === 'ar') {
                // In arabo, la colonna a sinistra sarà l'orario e a destra il nome della preghiera
                prayerElement.innerHTML = `
                    <span class="prayer-time-value">${time}</span>
                    <span class="prayer-name">${prayerNames[currentLanguage][prayer]}</span>
                `;
            } else {
                // In italiano, la colonna a sinistra sarà il nome della preghiera e a destra l'orario
                prayerElement.innerHTML = `
                    <span class="prayer-name">${prayerNames[currentLanguage][prayer]}</span>
                    <span class="prayer-time-value">${time}</span>
                `;
            }
    
            prayerTimesContainer.appendChild(prayerElement);
        });
    }
    
    // Funzione per aggiornare quale è la prossima preghiera e avviare il timer
    function updateNextPrayer() {
        if (!currentTimings) {
            return;
        }
        
        const now = new Date();
        let nextPrayerTime = null;
        let nextPrayerElement = null;
        
        // Rimuoviamo l'evidenziazione precedente
        document.querySelectorAll('.next-prayer').forEach(el => {
            el.classList.remove('next-prayer');
        });
        
        // Controlliamo tutte le preghiere
        document.querySelectorAll('.prayer-time').forEach(prayerEl => {
            const prayerTimeStr = prayerEl.dataset.time;
            const prayerTime = convertToDateTime(prayerTimeStr);
            
            if (prayerTime > now) {
                if (nextPrayerTime === null || prayerTime < nextPrayerTime) {
                    nextPrayerTime = prayerTime;
                    nextPrayerElement = prayerEl;
                }
            }
        });
        
        // Evidenziamo la prossima preghiera
        if (nextPrayerElement) {
            nextPrayerElement.classList.add('next-prayer');
            startTimer(nextPrayerTime);
        } else {
            // Se non c'è una prossima preghiera oggi, dobbiamo caricare i dati di domani
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowFormatted = formatDate(tomorrow);
            datePicker.value = tomorrowFormatted;
            
            loadHijriDate(tomorrowFormatted);
            loadPrayerTimes(currentCity, tomorrowFormatted);
        }
    }
    
    // Funzione per convertire gli orari in oggetti DateTime
    function convertToDateTime(timeStr) {
        const [hour, minute] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        return date;
    }
    
    // Funzione per avviare il timer
    function startTimer(nextPrayerTime) {
        const timerElement = document.getElementById('timer');
        
        if (!nextPrayerTime) {
            timerElement.textContent = '--:--:--';
            return;
        }
        
        // Funzione per aggiornare il timer ogni secondo
        function updateTime() {
            const now = new Date();
            const diff = nextPrayerTime - now;
            
            if (diff <= 0) {
                // Timer scaduto, aggiorna l'evidenziazione della prossima preghiera
                updateNextPrayer();
                return;
            }
            
            // Calcoliamo ore, minuti e secondi
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            // Aggiorniamo il timer
            timerElement.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
        }
        
        // Aggiorniamo il timer ogni secondo
        updateTime();
        clearInterval(window.timerInterval);
        window.timerInterval = setInterval(updateTime, 1000);
    }
    
    // Funzione per formattare la data nel formato richiesto dall'API
    function formatDate(date) {
        const day = padZero(date.getDate());
        const month = padZero(date.getMonth() + 1);
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }
    
    // Funzione per aggiungere lo zero iniziale se necessario
    function padZero(num) {
        return num < 10 ? `0${num}` : num;
    }
});
