// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCMWr8xf1tFgamwDOKnCuNuXudV_pPIBjY",
  authDomain: "solar-crm-a1a4b.firebaseapp.com",
  projectId: "solar-crm-a1a4b",
  storageBucket: "solar-crm-a1a4b.firebasestorage.app",
  messagingSenderId: "679973301128",
  appId: "1:679973301128:web:49ac6cbac19cf7c9b8a83d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Export Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);