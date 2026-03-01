import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCRNNlic6Wn0JwESvCweDPdYIGLxgrRB6c",
  authDomain: "circuit-cart-8722c.firebaseapp.com",
  projectId: "circuit-cart-8722c",
  storageBucket: "circuit-cart-8722c.firebasestorage.app",
  messagingSenderId: "14712627049",
  appId: "1:14712627049:web:32246d6a7eba33b10467f8",
  measurementId: "G-7HV1GQBV32"
};

// Initialize Firebase (Checks if it's already running to prevent Next.js hot-reload errors)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 EXPORT the services so your Next.js pages can use them!
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);