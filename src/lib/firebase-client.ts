import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCQ50yHyssxSdgjejSDOxfFAxNvw4muUf0",
  authDomain: "relaxdev-af44c.firebaseapp.com",
  databaseURL: "https://relaxdev-af44c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "relaxdev-af44c",
  storageBucket: "relaxdev-af44c.firebasestorage.app",
  messagingSenderId: "429684355996",
  appId: "1:429684355996:web:d0bebe5e382bba6a91ce59"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
