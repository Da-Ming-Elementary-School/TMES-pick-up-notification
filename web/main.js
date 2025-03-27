$(document).ready(function () {
    const storage = window.localStorage;
    let wsUrl = storage.getItem("wsUrl");
    if (wsUrl == null) {
        wsUrl = prompt("請輸入伺服器端的 IP 及端口 (如：ws://localhost:8001)");
        storage.setItem("wsUrl", wsUrl);
    }

    const WS = new WebSocket(wsUrl);
    $("#wsUrlDisplay").text(wsUrl);

    WS.onopen = function () {
        $("#wsUrlDisplay").css("color", "green");
    }

    WS.onerror = function (e) {
        console.error(e);
        alert("與伺服器連接失敗。請嘗試重新整理網頁，或檢查伺服器位址是否正確。");
        $("#wsUrlDisplay").css("color", "red");
    }

    WS.onclose = function (e) {
        if (e.code > 1001 && e.code !== 1006) {
            alert(`與伺服器的連線中斷。請嘗試重新整理網頁，或檢查伺服器位址是否正確。\n錯誤代碼：${e.code}`)
        }
        $("#wsUrlDisplay").css("color", "red");
    }

    WS.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const clsArray = data["students"];
        $.each(clsArray, function (index, value) {
            console.log(value);
            const clsNum = value["classNo"]
            const seatNum = value["seatNo"]
            const name = value["name"]
            const butMode = document.createElement("input");
            butMode.type = "button";
            butMode.id = clsNum + "-" + seatNum;
            butMode.className = "btn2";
            butMode.value = clsNum + "-" + seatNum + name;
            $("#btnGroup").append(butMode);
            $(`#${clsNum}-${seatNum}`).click(function (event) {
                const cls = this.id.slice(0,this.id.indexOf("-"))
                const num = this.id.slice(this.id.indexOf("-") + 1,this.id.length)
                const Name = this.value.slice(this.id.length , this.value.length)
                WS.send(JSON.stringify({
                    "classNo": cls,
                    "seatNo": num,
                    "name": Name
                }))
                alert(`已通知 ${cls}-${num}${Name}`)
            })

        })
        console.log(data)
    }
    var classNum = "";
    var body = $("body");
    // body.append("<h1>npm</h1>");
    // body.append("<p>6</p>");
    body.css("background-color", "pink");
    $(".btn").click(function () {
        classNum = this.id;
        WS.send(JSON.stringify({
            "type": "INIT",
            "classNo": classNum
        }))
        console.log(classNum);
        $("#btnGroup").empty();

    })
});