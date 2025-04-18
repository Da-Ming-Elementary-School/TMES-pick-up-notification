const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", (() => {
    // 🔌 WebSocket 設定
    const WS_URL = "ws://0.0.0.0:8001"; // ← 換成你的 WebSocket URL
    let socket = null;
    let reconnectTimer = null;

    // ⏰ 嘗試重新連線
    function reconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            initWebSocket();
            reconnectTimer = null;
        }, 3000); // 每 3 秒重連一次
    }

    // 🚀 初始化 WebSocket
    function initWebSocket() {
        socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log("[WebSocket] 已連線");
        };

        socket.onmessage = (event) => {
            const data = event.data;

            // 系統通知
            new Notification("🔔 通知來囉", {
                body: data
            });

            // 若網頁要同步收到（例如顯示在 UI 上）
            if (typeof window.onWebSocketMessage === "function") {
                window.onWebSocketMessage(data);
            }
        };

        socket.onclose = () => {
            console.warn("[WebSocket] 斷線，嘗試重新連線...");
            reconnect();
        };

        socket.onerror = (err) => {
            console.error("[WebSocket] 錯誤：", err);
            socket.close(); // 強制斷線進入 onclose
        };
    }

    // 初始化連線
    initWebSocket();

    // 暴露 API 給前端
    return {
        sendMessage: (msg) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(msg);
            }
        },
        setOnMessageHandler: (callback) => {
            window.onWebSocketMessage = callback;
        }
    };
})());
