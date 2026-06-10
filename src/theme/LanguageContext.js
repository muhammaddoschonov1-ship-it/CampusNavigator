import React, { createContext, useContext, useState, useMemo } from 'react';

const LanguageContext = createContext();

const translations = {
  uz: {
    // Login
    loginTitle: 'NDTU Navigator',
    loginSubtitle: "Nukus Davlat Texnika Universiteti",
    loginWelcome: 'Xush kelibsiz!',
    loginDesc: 'Kampus navigatsiya tizimiga kirish',
    loginNamePlaceholder: "Ism-familiyangiz",
    loginIdPlaceholder: "Talaba ID raqami",
    loginPasswordPlaceholder: "Parol",
    loginButton: 'Kirish',
    loginGuest: "Mehmon sifatida davom etish",
    loginRemember: "Eslab qolish",
    groupPlaceholder: "Guruh raqami va harfi (Masalan: 301-A)",

    // Home
    greeting: 'Salom!',
    appTitle: 'NDTU Navigator',
    universityName: "Nukus Davlat Texnika Universiteti",
    searchPlaceholder: 'Xona yoki bino qidirish...',
    campusMap: 'NDTU Kampus Xaritasi',
    quickLinks: 'Tez havolalar',
    popularPlaces: 'Mashhur joylar',
    seeAll: 'Barchasi →',
    buildings: 'Binolar',
    rooms: 'Xonalar',
    categories: 'Kategoriya',
    auditoriyalar: 'Auditoriyalar',
    kutubxona: 'Kutubxona',
    oshxona: 'Oshxona',
    sport: 'Sport',

    // Search
    searchTitle: 'Qidiruv',
    searchPlaceholder2: 'Xona, bino, kategoriya...',
    allCategory: 'Barchasi',
    auditoriya: 'Auditoriya',
    ofis: 'Ofis',
    lab: 'Lab',
    tibbiyot: 'Tibbiyot',
    results: 'ta natija',
    clearFilter: 'Filtrni tozalash',
    nothingFound: 'Hech narsa topilmadi',
    tryAnother: "Boshqa kalit so'z bilan qidirib ko'ring yoki\nkategoriya filtrini o'zgartiring",
    floor: 'qavat',

    // Room Detail
    open: 'Ochiq',
    building: 'Bino',
    floorLabel: 'Qavat',
    type: 'Tur',
    capacity: "Sig'im",
    seat: "o'rin",
    description: 'Tavsif',
    workingHours: 'Ish vaqti',
    monFri: 'Dushanba - Juma',
    saturday: 'Shanba',
    sunday: 'Yakshanba',
    dayOff: 'Dam olish',
    navigate: "Yo'l ko'rsat",
    closeNav: "Yo'lni yopish",
    navigation: "Yo'l ko'rsatish",
    startPoint: "Boshlang'ich nuqta",
    arrived: "✓ Manzilga yetib keldingiz!",
    approxDistance: 'Taxminan',
    meters: 'm',
    minuteWalk: "daqiqa yurish",
    share: 'Ulashish',
    liveNavigation: 'Real vaqt navigatsiya',
    step: 'Qadam',
    walking: 'Yurilmoqda...',
    completed: 'Bajarildi!',
    startNavigation: 'Navigatsiyani boshlash',
    stopNavigation: "To'xtatish",
    nextStep: 'Keyingi qadam',

    // Navigation steps
    enterMainGate: 'Asosiy darvozadan kiring',
    walkStraight: "To'g'riga yuring",
    turnLeft: 'Chapga buriling',
    turnRight: "O'ngga buriling",
    goUpFloor: 'qavatga ko\'tariling',
    findRoom: 'ni toping',

    // Profile
    profileTitle: 'Profil',
    savedPlaces: 'Saqlangan joylar',
    settings: 'Sozlamalar',
    notifications: 'Bildirishnomalar',
    darkMode: "Qorong'u rejim",
    lightMode: 'Kunduzgi rejim',
    language: 'Til',
    aboutApp: 'Ilova haqida',
    logout: 'Tizimdan chiqish',
    logoutConfirm: 'Haqiqatan ham tizimdan chiqmoqchimisiz?',
    cancel: 'Bekor qilish',
    visits: 'Tashrif',
    saved: 'Saqlangan',
    days: 'Kun',
    student: 'Talaba Foydalanuvchi',
    course: '3-kurs, Informatika',

    // Notifications
    notifTitle: 'Bildirishnomalar',
    markAllRead: "Barchasini o'qilgan deb belgilash",
    newNotifs: 'ta yangi bildirishnoma',
    allRead: "Barcha bildirishnomalar o'qilgan",
    noNotifs: "Bildirishnomalar yo'q",
    noNotifsDesc: "Yangi xabarlar va e'lonlar shu yerda ko'rinadi",

    // Language names
    langUzbek: "O'zbekcha",
    langRussian: 'Ruscha',
    adminPanel: 'Boshqaruv',
    homeTab: 'Bosh sahifa',

    // Schedule
    dayNames: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'],
    monthNames: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
    todaySchedule: 'Bugungi dars jadvali',
    tomorrow: 'Ertangi',
    kungi: 'kungi',
    schedule: 'Dars jadvali',
    jadval: 'jadval',

    // Filters and types
    filter: 'Filtrlash',
    byBuilding: "Bino bo'yicha",
    byFloor: "Qavat bo'yicha",
    apply: "Qo'llash",
    lecture: "Ma'ruza",
    practice: "Amaliyot",
    "Ma'ruza": "Ma'ruza",
    "Amaliyot": "Amaliyot",
    "Laboratoriya": "Laboratoriya",
    mapView: 'Xarita',
    blueprintView: 'Chizma',
    noClasses: 'Darslar topilmadi 🎉',
  },

  ru: {
    // Login
    loginTitle: 'NDTU Навигатор',
    loginSubtitle: 'Нукусский государственный технический университет',
    loginWelcome: 'Добро пожаловать!',
    loginDesc: 'Войдите в систему навигации кампуса',
    loginNamePlaceholder: 'Ваше имя',
    loginIdPlaceholder: 'ID студента',
    loginPasswordPlaceholder: 'Пароль',
    loginButton: 'Войти',
    loginGuest: 'Продолжить как гость',
    loginRemember: 'Запомнить',
    groupPlaceholder: "Номер и буква группы (Например: 301-А)",

    // Home
    greeting: 'Привет!',
    appTitle: 'NDTU Навигатор',
    universityName: 'Нукусский государственный технический университет',
    searchPlaceholder: 'Поиск комнаты или здания...',
    campusMap: 'Карта кампуса NDTU',
    quickLinks: 'Быстрые ссылки',
    popularPlaces: 'Популярные места',
    seeAll: 'Все →',
    buildings: 'Здания',
    rooms: 'Комнаты',
    categories: 'Категории',
    auditoriyalar: 'Аудитории',
    kutubxona: 'Библиотека',
    oshxona: 'Столовая',
    sport: 'Спорт',

    // Search
    searchTitle: 'Поиск',
    searchPlaceholder2: 'Комната, здание, категория...',
    allCategory: 'Все',
    auditoriya: 'Аудитория',
    ofis: 'Офис',
    lab: 'Лаборатория',
    tibbiyot: 'Медпункт',
    results: 'результатов',
    clearFilter: 'Сбросить фильтр',
    nothingFound: 'Ничего не найдено',
    tryAnother: 'Попробуйте другое ключевое слово или\nизмените фильтр категории',
    floor: 'этаж',

    // Room Detail
    open: 'Открыто',
    building: 'Здание',
    floorLabel: 'Этаж',
    type: 'Тип',
    capacity: 'Вместимость',
    seat: 'мест',
    description: 'Описание',
    workingHours: 'Время работы',
    monFri: 'Понедельник - Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
    dayOff: 'Выходной',
    navigate: 'Показать путь',
    closeNav: 'Закрыть маршрут',
    navigation: 'Навигация',
    startPoint: 'Начальная точка',
    arrived: '✓ Вы прибыли!',
    approxDistance: 'Примерно',
    meters: 'м',
    minuteWalk: 'мин ходьбы',
    share: 'Поделиться',
    liveNavigation: 'Навигация в реальном времени',
    step: 'Шаг',
    walking: 'Идём...',
    completed: 'Готово!',
    startNavigation: 'Начать навигацию',
    stopNavigation: 'Остановить',
    nextStep: 'Следующий шаг',

    // Navigation steps
    enterMainGate: 'Войдите через главные ворота',
    walkStraight: 'Идите прямо',
    turnLeft: 'Поверните налево',
    turnRight: 'Поверните направо',
    goUpFloor: 'этаж — поднимитесь',
    findRoom: '— найдите',

    // Profile
    profileTitle: 'Профиль',
    savedPlaces: 'Сохранённые места',
    settings: 'Настройки',
    notifications: 'Уведомления',
    darkMode: 'Тёмная тема',
    lightMode: 'Светлая тема',
    language: 'Язык',
    aboutApp: 'О приложении',
    logout: 'Выйти из системы',
    logoutConfirm: 'Вы действительно хотите выйти?',
    cancel: 'Отмена',
    visits: 'Визиты',
    saved: 'Сохранено',
    days: 'Дней',
    student: 'Студент',
    course: '3 курс, Информатика',

    // Notifications
    notifTitle: 'Уведомления',
    markAllRead: 'Отметить все как прочитанные',
    newNotifs: 'новых уведомлений',
    allRead: 'Все уведомления прочитаны',
    noNotifs: 'Нет уведомлений',
    noNotifsDesc: 'Новые сообщения и объявления появятся здесь',

    // Language names
    langUzbek: 'Узбекский',
    langRussian: 'Русский',
    adminPanel: 'Управление',
    homeTab: 'Главная',

    // Schedule
    dayNames: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    monthNames: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    todaySchedule: 'Сегодняшнее расписание',
    tomorrow: 'Завтрашнее',
    kungi: 'расписание',
    schedule: 'Расписание',
    jadval: 'расписание',
    
    // Filters and types
    filter: 'Фильтрация',
    byBuilding: 'По зданию',
    byFloor: 'По этажу',
    apply: 'Применить',
    lecture: 'Лекция',
    practice: 'Практика',
    "Ma'ruza": 'Лекция',
    "Amaliyot": 'Практика',
    "Laboratoriya": 'Лаборатория',
    mapView: 'Карта',
    blueprintView: 'Схема',
    noClasses: 'Нет занятий 🎉',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('uz');

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
