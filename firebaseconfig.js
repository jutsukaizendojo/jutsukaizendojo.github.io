const firebaseConfig = {
  apiKey: "AIzaSyAWV7AH1BStqGgjsIVHPc4Rr-6PHyzIZt4",
  authDomain: "technique-selection.firebaseapp.com",
  databaseURL: "https://technique-selection-default-rtdb.firebaseio.com",
  projectId: "technique-selection",
  storageBucket: "technique-selection.firebasestorage.app",
  messagingSenderId: "997872424088",
  appId: "1:997872424088:web:07580b9fc8f61718e4eced",
  measurementId: "G-9J257EYL93"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);