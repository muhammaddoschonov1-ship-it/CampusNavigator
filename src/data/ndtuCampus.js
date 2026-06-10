/**
 * Nókis mámleketlik texnika universiteti (NDTU) — kampus ma'lumotlari.
 * Koordinatalar: OpenStreetMap + PQ-25 (24.01.2025) ilova.
 */

export const NDTU = {
  name: "Nókis mámleketlik texnika universiteti",
  nameRu: 'Нукусский государственный технический университет',
  nameShort: 'NDTU',
  /** Asosiy kampus (Dosnazarov + Kayipbergenov) */
  center: { lat: 42.4633, lng: 59.6212 },
  zoom: 17,
  /** Barcha Nukus obyektlari (3 ta o'quv bino + filiallar) */
  cityCenter: { lat: 42.4395, lng: 59.6185 },
  cityZoom: 14,
  gate: { lat: 42.46125, lng: 59.6219 },
};

export const CAMPUS_BUILDINGS = [
  {
    id: 'ndtu-1',
    name: "1-o'quv binosi (Bosh bino)",
    nameRu: '1-й учебный корпус (Главный)',
    lat: 42.4618934,
    lng: 59.6214471,
    address: "A. Dosnazarov ko'chasi, 74",
    type: 'university',
    icon: '🏛️',
    color: '#6C63FF',
    official: true,
  },
  {
    id: 'ndtu-2',
    name: "2-o'quv binosi",
    nameRu: '2-й учебный корпус',
    lat: 42.4647047,
    lng: 59.6208847,
    address: "T. Kayipbergenov ko'chasi, 26",
    type: 'university',
    icon: '🏢',
    color: '#63B3ED',
    official: true,
  },
  {
    id: 'ndtu-3',
    name: "3-o'quv binosi",
    nameRu: '3-й учебный корпус',
    lat: 42.4137278,
    lng: 59.6185009,
    address: "A. Utepov ko'chasi, 10",
    type: 'university',
    icon: '🎓',
    color: '#10B981',
    official: true,
  },
  {
    id: 'ndtu-politex',
    name: '1-son politexnikum',
    nameRu: 'Политехникум №1',
    lat: 42.4142,
    lng: 59.6191,
    address: "A. Utepov ko'chasi (NDTU tarkibida)",
    type: 'college',
    icon: '🔧',
    color: '#F59E0B',
    official: true,
  },
  {
    id: 'ndtu-tatu-pidakar',
    name: 'TATU Nukus filiali (Pidakar)',
    nameRu: 'Филиал ТАТУ (Пиджакар)',
    lat: 42.4432149,
    lng: 59.6097116,
    address: "Pidakar ko'chasi, 10",
    type: 'university',
    icon: '💻',
    color: '#E879F9',
    official: false,
  },
  {
    id: 'ndtu-tatu-tan',
    name: 'TATU Nukus (Tan Zhuldyzy)',
    nameRu: 'Филиал ТАТУ (Тан Жулдызы)',
    lat: 42.4409509,
    lng: 59.6092206,
    address: "Tan Zhuldyzy ko'chasi",
    type: 'university',
    icon: '🖥️',
    color: '#A78BFA',
    official: false,
  },
  {
    id: 'ndtu-gate',
    name: 'Asosiy kirish',
    nameRu: 'Главный вход',
    lat: 42.46125,
    lng: 59.6219,
    address: "Dosnazarov ko'chasi qarshisi",
    type: 'entrance',
    icon: '🚪',
    color: '#94A3B8',
  },
  {
    id: 'ndtu-library',
    name: 'Markaziy kutubxona',
    nameRu: 'Центральная библиотека',
    lat: 42.46195,
    lng: 59.62115,
    address: "1-o'quv bino ichida / yonida",
    type: 'library',
    icon: '📚',
    color: '#00D4AA',
  },
  {
    id: 'ndtu-canteen',
    name: 'Talabalar oshxonasi',
    nameRu: 'Столовая',
    lat: 42.46415,
    lng: 59.62055,
    address: "2-o'quv bino yaqinida",
    type: 'canteen',
    icon: '🍽️',
    color: '#FFB347',
  },
  {
    id: 'ndtu-sport',
    name: 'Sport majmuasi',
    nameRu: 'Спортивный комплекс',
    lat: 42.46505,
    lng: 59.62025,
    address: "Kayipbergenov ko'chasi hududi",
    type: 'sport',
    icon: '🏋️',
    color: '#FF6B6B',
  },
  {
    id: 'ndtu-dorm',
    name: 'Talabalar yotoqxonasi',
    nameRu: 'Общежитие',
    lat: 42.46055,
    lng: 59.62215,
    address: 'Asosiy kampus janubi',
    type: 'dormitory',
    icon: '🏠',
    color: '#A78BFA',
  },
  {
    id: 'ndtu-it-lab',
    name: 'IT va axborot texnologiyalari',
    nameRu: 'ИТ и информационные технологии',
    lat: 42.46435,
    lng: 59.62105,
    address: "2-o'quv bino",
    type: 'faculty',
    icon: '💻',
    color: '#38BDF8',
  },
  {
    id: 'ndtu-mining',
    name: 'Konchilik va metallurgiya',
    nameRu: 'Горное дело и металлургия',
    lat: 42.46215,
    lng: 59.62175,
    address: "1-o'quv bino",
    type: 'faculty',
    icon: '⛏️',
    color: '#78716C',
  },
  {
    id: 'ndtu-engineering',
    name: "Ilg'or muhandislik maktabi",
    nameRu: 'Школа передовой инженерии',
    lat: 42.46255,
    lng: 59.62135,
    address: "1-o'quv bino",
    type: 'faculty',
    icon: '🔬',
    color: '#F472B6',
  },
  {
    id: 'ndtu-rektorat',
    name: 'Rektorat',
    nameRu: 'Ректорат',
    lat: 42.46205,
    lng: 59.62155,
    address: "1-o'quv bino, 3-qavat",
    type: 'office',
    icon: '🏛️',
    color: '#818CF8',
  },
  {
    id: 'ndtu-medical',
    name: 'Tibbiyot punkti',
    nameRu: 'Медпункт',
    lat: 42.46165,
    lng: 59.62125,
    address: "1-o'quv bino",
    type: 'medical',
    icon: '🏥',
    color: '#F87171',
  },
];

/** NavigationMapView va qidiruv uchun qisqa nom → koordinata */
export const BUILDINGS_BY_NAME = CAMPUS_BUILDINGS.reduce((acc, b) => {
  acc[b.name] = {
    lat: b.lat,
    lng: b.lng,
    icon: b.icon,
    color: b.color,
    id: b.id,
  };
  return acc;
}, {});

/** Eski xona nomlari bilan moslik */
export const BUILDING_ALIASES = {
  'Bosh bino': "1-o'quv binosi (Bosh bino)",
  'Kutubxona binosi': 'Markaziy kutubxona',
  'Oshxona binosi': 'Talabalar oshxonasi',
  'Fizika-matematika fakulteti': 'IT va axborot texnologiyalari',
  'Filologiya fakulteti': 'Konchilik va metallurgiya',
  'Sport binosi': 'Sport majmuasi',
  'Yotoqxona binosi': 'Talabalar yotoqxonasi',
};

export const resolveBuildingName = (name) =>
  BUILDING_ALIASES[name] || name;

export const getBuildingCoords = (name) => {
  const resolved = resolveBuildingName(name);
  return BUILDINGS_BY_NAME[resolved] || BUILDINGS_BY_NAME["1-o'quv binosi (Bosh bino)"];
};
