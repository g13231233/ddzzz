# 金币点击游戏

这是一个基于Firebase的网页联机游戏。玩家可以注册登录，点击按钮获得金币，并查看排行榜。

## 设置步骤

1. 前往 [Firebase Console](https://console.firebase.google.com/) 创建新项目。

2. 启用 Authentication：
   - 转到 Authentication > Sign-in method
   - 启用 Email/Password

3. 启用 Firestore：
   - 转到 Firestore Database
   - 创建数据库，选择测试模式

4. 获取配置：
   - 转到 Project settings > General
   - 复制 Firebase config 到 `firebase-config.js` 中的 `firebaseConfig` 对象

5. 打开 `index.html` 在浏览器中运行（需要本地服务器，如Live Server扩展）。

## 功能

- 用户注册和登录
- 点击按钮获得金币
- 实时排行榜
- 登出功能

## 技术栈

- HTML/CSS/JavaScript
- Firebase Authentication
- Firebase Firestore