// ==========================================
// 📦 API Index — barcha xizmatlarni eksport qilish
// ==========================================

export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  resetPassword, 
  onAuthChange, 
  updateUserProfile 
} from './authService';

export { 
  getAllRooms, 
  getRoomById, 
  getRoomsByBuilding, 
  getRoomsByType, 
  searchRooms, 
  getEvents, 
  getCampusStats,
  addRoom,
  updateRoom,
  deleteRoom,
  setFirebaseMode,
} from './roomsService';

export { auth, db } from './firebase';
