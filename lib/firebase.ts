import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBjvbrfZiKdy2IK5JnJuat5LvUwsZFEkQI",
  authDomain: "habit-tracker-918ba.firebaseapp.com",
  projectId: "habit-tracker-918ba",
  storageBucket: "habit-tracker-918ba.firebasestorage.app",
  messagingSenderId: "924638103325",
  appId: "1:924638103325:web:d747a5e8b7cc8a0f0b43f4",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)