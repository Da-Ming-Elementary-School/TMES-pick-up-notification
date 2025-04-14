// ==UserScript==
// @name         WebSocket Message Display
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  接收 WebSocket 訊息並在網頁中顯示
// @author       Your Name
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // -------------------- 配置 --------------------
    const displayContainerId = "websocket-message-container";
    const messageDuration = 5000; // 訊息顯示的毫秒數 (5 秒)

    // -------------------- 樣式 --------------------
    const containerStyle = `
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 9999;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 14px;
        line-height: 1.5;
        max-width: 300px;
        overflow: hidden;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
    `;

    const messageStyle = `
        margin-bottom: 5px;
        opacity: 1;
        transition: opacity 0.5s ease-in-out;
    `;

    // -------------------- 函數 --------------------
    function createDisplayContainer() {
        let container = document.getElementById(displayContainerId);
        if (!container) {
            container = document.createElement('div');
            container.id = displayContainerId;
            container.style.cssText = containerStyle;
            document.body.appendChild(container);
        }
        return container;
    }

    function displayMessage(messageText) {
        const container = createDisplayContainer();
        const messageElement = document.createElement('div');
        messageElement.style.cssText = messageStyle;
        messageElement.textContent = messageText;
        container.prepend(messageElement); // 將新訊息添加到最上方

        // 設定過一段時間後淡出並移除訊息
        setTimeout(() => {
            messageElement.style.opacity = 0;
            setTimeout(() => {
                container.removeChild(messageElement);
                if (container.children.length === 0) {
                    // 可選：如果沒有訊息了，可以移除容器
                    container.remove();
                }
            }, 500); // 等待淡出動畫完成
        }, messageDuration);
    }

    window.addEventListener('message', function (event) {
        displayMessage(event.data);
    });
})();