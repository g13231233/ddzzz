import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, setDoc, getDoc, updateDoc, collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const nameContainer = document.getElementById('name-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authMessage = document.getElementById('auth-message');
const nameInput = document.getElementById('name-input');
const nameSubmitBtn = document.getElementById('name-submit-btn');
const nameMessage = document.getElementById('name-message');
const coinCount = document.getElementById('coin-count');
const clickBtn = document.getElementById('click-btn');
const leaderboard = document.getElementById('leaderboard');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let userCoins = 0;
let userName = '';

// 监听认证状态
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userCoins = 0; // 重置金币计数
        coinCount.textContent = '0'; // 重置显示
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().name) {
            userName = userDoc.data().name;
            authContainer.style.display = 'none';
            nameContainer.style.display = 'none';
            gameContainer.style.display = 'block';
            loadUserData();
            loadLeaderboard();
        } else {
            authContainer.style.display = 'none';
            nameContainer.style.display = 'block';
            gameContainer.style.display = 'none';
        }
    } else {
        currentUser = null;
        authContainer.style.display = 'block';
        nameContainer.style.display = 'none';
        gameContainer.style.display = 'none';
    }
});

// 注册
registerBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        authMessage.textContent = '注册成功！';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            authMessage.textContent = '该邮箱已被注册';
        } else {
            authMessage.textContent = error.message;
        }
    }
});

// 登录
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authMessage.textContent = '登录成功';
    } catch (error) {
        authMessage.textContent = error.message;
    }
});

// 起名
nameSubmitBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
        nameMessage.textContent = '请输入名字';
        return;
    }
    try {
        await setDoc(doc(db, 'users', currentUser.uid), { name, coins: 0, email: currentUser.email }, { merge: true });
        userName = name;
        nameContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        loadUserData();
        loadLeaderboard();
    } catch (error) {
        nameMessage.textContent = error.message;
    }
});

// 登出
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

// 点击获得金币
clickBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    userCoins++;
    coinCount.textContent = userCoins;
    await updateUserCoins();
    loadLeaderboard();
});

// 加载用户数据
async function loadUserData() {
    if (!currentUser) return;
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const data = userDoc.data();
        userCoins = data.coins || 0;
        userName = data.name || '';
    } else {
        userCoins = 0;
        userName = '';
        await setDoc(doc(db, 'users', currentUser.uid), { coins: 0, email: currentUser.email });
    }
    coinCount.textContent = userCoins;
}

// 更新用户金币
async function updateUserCoins() {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), { coins: userCoins });
}

// 加载排行榜
async function loadLeaderboard() {
    const q = query(collection(db, 'users'), orderBy('coins', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    leaderboard.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const name = data.name || data.email; // 如果没有名字，用邮箱
        const li = document.createElement('li');
        li.textContent = `${name}: ${data.coins} 金币`;
        leaderboard.appendChild(li);
    });
}