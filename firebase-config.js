// Firebase 配置
// 请在 Firebase 控制台创建项目，并替换以下配置
const firebaseConfig = {
  apiKey: "AIzaSyCE4VKsO86HkPgfo9bDfx0oQ14zecg1wVA",
  authDomain: "durango110.firebaseapp.com",
  projectId: "durango110",
  storageBucket: "durango110.firebasestorage.app",
  messagingSenderId: "674394866246",
  appId: "1:674394866246:web:72ecd92fed2e703f124047"
};

// 初始化 Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);