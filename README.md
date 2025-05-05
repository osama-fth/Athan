# 🕌 Athan - Orari delle Preghiere Islamiche

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

Un'elegante applicazione web per visualizzare gli orari delle preghiere islamiche con supporto multilingua e calcolo preciso del tempo rimanente.

## 📚 Descrizione

Athan è un'applicazione web che fornisce orari precisi per le preghiere islamiche in qualsiasi città del mondo. Utilizzando API esterne per raccogliere dati geospaziali e orari di preghiera, l'app permette agli utenti di:

- Cercare qualsiasi città nel mondo
- Visualizzare gli orari delle 5 preghiere giornaliere
- Vedere un countdown in tempo reale per la prossima preghiera
- Consultare il calendario islamico (Hijri)
- Cambiare lingua tra italiano e arabo (con supporto completo RTL)

## ✨ Funzionalità principali

- 🔍 **Ricerca città** con suggerimenti automatici
- ⏱️ **Timer countdown** alla prossima preghiera
- 🕰️ **Orari precisi** per tutte le preghiere (Fajr, Dhuhr, Asr, Maghrib, Isha)
- 📅 **Date Hijri** corrispondenti al calendario islamico
- 🔄 **Cache locale** per ottimizzare le richieste API
- 🌐 **Supporto multilingua** (italiano e arabo)
- 📱 **Design responsive** per tutti i dispositivi
- 🌍 **Rilevamento fuso orario** automatico per le città

## 🛠️ Tecnologie utilizzate

- **HTML5** per la struttura della pagina
- **CSS3** per lo stile e la responsività
- **JavaScript** (Vanilla ES6+) per la logica dell'applicazione
- **LocalStorage API** per la persistenza dei dati
- **Fetch API** per le richieste HTTP

## 🚀 Come usare l'applicazione

1. **Cerca una città**: Utilizza la barra di ricerca per trovare la tua città
2. **Seleziona la data**: Usa il selettore di data o il pulsante "Oggi"
3. **Visualizza gli orari**: Gli orari delle preghiere verranno mostrati automaticamente
4. **Monitora il tempo**: Il countdown mostrerà quanto manca alla prossima preghiera

## 📂 Struttura del progetto

```
athan/
├── index.html          # Pagina principale
├── style.css           # Stili CSS
├── js/
│   ├── app.js          # Punto di ingresso dell'applicazione
│   ├── citySearch.js   # Gestione ricerca città
│   ├── dateUtils.js    # Utilità per gestione date
│   ├── prayerTimes.js  # Logica per gli orari delle preghiere
│   ├── timezoneService.js # Servizio per la gestione dei fusi orari
│   └── translations.js # File per traduzioni multilingua
└── README.md           # Documentazione
```

## 🔄 API utilizzate

- [Aladhan Prayer Times API](https://aladhan.com/prayer-times-api) - Per gli orari delle preghiere
- [Aladhan Islamic Calendar API](https://aladhan.com/islamic-calendar-api) - Per la conversione date Hijri
- [Nominatim OpenStreetMap](https://nominatim.openstreetmap.org/ui/search.html) - Per la ricerca delle città
- [GeoNames Timezone API](https://www.geonames.org/export/web-services.html) - Per la gestione dei fusi orari

## 📱 Caratteristiche responsive

L'applicazione è completamente responsive e ottimizzata per:
- Desktop e laptop
- Tablet
- Smartphone
- Supporto RTL per lingua araba su tutti i dispositivi
