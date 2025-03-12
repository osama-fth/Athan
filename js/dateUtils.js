export function formatDate(date) {
    const day = padZero(date.getDate());
    const month = padZero(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

export function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

export function loadHijriDate(gregorianDate, currentLanguage) {
    const [year, month, day] = gregorianDate.split('-');
    const apiUrl = `https://api.aladhan.com/v1/gToH/${day}-${month}-${year}`;

    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.data) {
                const hijri = data.data.hijri;
                return currentLanguage === 'ar' ? 
                    `${hijri.day} ${hijri.month.ar} ${hijri.year}` :
                    `${hijri.day} ${hijri.month.en} ${hijri.year}`;
            }
            throw new Error('Invalid response');
        });
}

export function convertToDateTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const prayerTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0
    );
    
    return prayerTime;
}
