// ==UserScript==
// @name         大明學生呼叫系統 (無邊際通知)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  即使在不同網頁，也能接收呼叫通知
// @author       Michael Xu & Allen Wei
// @match        https://*/*
// @match        http://*/*
// @grant        none
// @updateURL    https://da-ming-elementary-school.github.io/TMES-pick-up-notification/plugin/plugin.meta.js
// @downloadURL  https://da-ming-elementary-school.github.io/TMES-pick-up-notification/plugin/plugin.user.js
// ==/UserScript==

(function connectWS() {
    const socket = new WebSocket("wss://192.168.112.104:8001");
    socket.onopen = () => {
        console.log("✅ WebSocket 連線成功！");
        socket.send(JSON.stringify({
            "type": "WHO_AM_I",
            // "classNo": "1A"
        }))
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data["type"] === "INIT"){
        socket.send(JSON.stringify(data));
        }
        console.log(data);
        showToast(data);
    };

    socket.onerror = (err) => {
        console.error("WebSocket 發生錯誤：", err);
    };


    // 顯示通知的小提示框
    function showToast(msg) {
        const el = document.createElement("div");
        el.className = "websocket-toast";
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    // 設定簡單的 CSS 樣式，讓通知能顯示出來
    const style = document.createElement("style");
    style.textContent = `
        .websocket-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            padding: 12px 18px;
            border-radius: 10px;
            font-size: 16px;
            z-index: 99999;
        }
    `;
    document.head.appendChild(style);
})();
