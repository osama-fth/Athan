document.addEventListener('DOMContentLoaded', function() {
    // Coordinate delle città
    const cities = {
        'galliate': { lat: 45.4798, lng: 8.6995, name: 'Galliate', nameAr: 'غالياتي' },
        'trecate': { lat: 45.4324, lng: 8.7389, name: 'Trecate', nameAr: 'تريكاتي' },
        'novara': { lat: 45.4457, lng: 8.6195, name: 'Novara', nameAr: 'نوفارا' }
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
    
    // Traduzioni delle stringhe dell'interfaccia
    const translations = {
        'it': {
            'title': 'Orari delle Preghiere',
            'timer': 'Tempo rimanente per la prossima preghiera:',
            'date': 'Seleziona data:',
            'today': 'Oggi',
            'language': 'العربية',
            'cities': {
                'galliate': 'Galliate',
                'trecate': 'Trecate',
                'novara': 'Novara'
            }
        },
        'ar': {
            'title': 'أوقات الصلاة',
            'timer': 'الوقت المتبقي للصلاة القادمة:',
            'date': 'اختر التاريخ:',
            'today': 'اليوم',
            'language': 'Italiano',
            'cities': {
                'galliate': 'غالياتي',
                'trecate': 'تريكاتي',
                'novara': 'نوفارا'
            }
        }
    };
    
    // Elementi DOM
    const datePicker = document.getElementById('date-picker');
    const todayButton = document.getElementById('today-btn');
    const hijriDateElement = document.getElementById('hijri-date');
    const selectedCityElement = document.getElementById('selected-city');
    const prayerTimesContainer = document.querySelector('.prayer-times');
    const cityButtons = document.querySelectorAll('.city-btn');
    const languageToggle = document.getElementById('language-toggle');
    const timerLabel = document.getElementById('timer-label');
    const dateLabel = document.getElementById('date-label');
    const titleElement = document.querySelector('h1');
    
    // Stato dell'applicazione
    let currentCity = 'galliate';
    let currentTimings = null;
    let currentLanguage = 'it';
    
    // Imposta la data di oggi come valore predefinito
    const today = new Date();
    const formattedDate = formatDate(today);
    datePicker.value = formattedDate;
    
    // Carica la data islamica e gli orari di preghiera
    loadHijriDate(formattedDate);
    loadPrayerTimes(currentCity, formattedDate);
    
    // Event listener per il cambio di data
    datePicker.addEventListener('change', function() {
        loadHijriDate(this.value);
        loadPrayerTimes(currentCity, this.value);
    });
    
    // Event listener per il pulsante "Oggi"
    todayButton.addEventListener('click', function() {
        const todayDate = new Date();
        const formattedToday = formatDate(todayDate);
        datePicker.value = formattedToday;
        loadHijriDate(formattedToday);
        loadPrayerTimes(currentCity, formattedToday);
    });
    
    // Event listener per i pulsanti delle città
    cityButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Rimuovi la classe active da tutti i pulsanti
            cityButtons.forEach(btn => btn.classList.remove('active'));
            
            // Aggiungi la classe active al pulsante cliccato
            this.classList.add('active');
            
            // Aggiorna la città corrente
            currentCity = this.dataset.city;
            updateCityName();
            
            // Carica gli orari di preghiera per la nuova città
            loadPrayerTimes(currentCity, datePicker.value);
        });
    });
    
    // Event listener per il cambio lingua
    languageToggle.addEventListener('click', function() {
        toggleLanguage();
    });
    
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
        
        // Aggiorna i pulsanti delle città
        cityButtons.forEach(button => {
            const cityId = button.dataset.city;
            button.textContent = translations[currentLanguage].cities[cityId];
        });

        // Aggiorna il nome della città
        updateCityName();
        loadHijriDate(formattedDate);
        

        // Se abbiamo già caricato gli orari, li aggiorniamo con i nuovi nomi
        if (currentTimings) {
            displayPrayerTimes(currentTimings);
        }
        updateNextPrayer();
    }
    
    // Funzione per aggiornare il nome della città in base alla lingua
    function updateCityName() {
        if (currentLanguage === 'ar') {
            selectedCityElement.textContent = cities[currentCity].nameAr;
        } else {
            selectedCityElement.textContent = cities[currentCity].name;
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
                    // updateNextPrayer()
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
    function loadPrayerTimes(cityId, date) {
        const cacheKey = `${cityId}-${date}`;
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
        const city = cities[cityId];
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
                console.error(`Errore nel caricamento degli orari per ${city.name}:`, error);
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
