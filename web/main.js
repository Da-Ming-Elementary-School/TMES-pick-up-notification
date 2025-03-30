$(document).ready(function () {
    let wsUrl = configServerUrl()
    const WS = new WebSocket(wsUrl);
    $("#wsUrlDisplay").text(wsUrl);

    WS.onopen = function () {
        $("#wsUrlDisplay").css("color", "green");
        WS.send(JSON.stringify({
            "type": "INIT",
            "classNo": 777
        }))
        document.getElementById("call-history").style.visibility = "hidden";
        document.getElementById("call-history").style.height = "0";
        document.getElementById("backtohome").style.visibility = "hidden";
        document.getElementById("backtohome").style.width = "0";
        document.getElementById("backtohome").style.padding = "0";
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
        $(".btn").on("click", function () {
            const targetClsNo = parseInt(this.id);
            const studentArray = clsArray[parseInt(this.id)]
            if (data["type"] === "STUDENT_LIST") {
                $.each(studentArray, function (index, value) {
                    console.log(value);
                    const clsNum = value["classNo"];
                    const seatNum = value["seatNo"];
                    const name = value["name"];
                    const butMode = document.createElement("input");
                    butMode.type = "button";
                    butMode.id = clsNum + "-" + seatNum;
                    butMode.className = "btn2";
                    butMode.value = clsNum + "-" + seatNum + name;
                    $("#btnGroup").append(butMode);
                    $(`#${clsNum}-${seatNum}`).click(function () {
                        const cls = this.id.slice(0, this.id.indexOf("-"));
                        const num = this.id.slice(this.id.indexOf("-") + 1, this.id.length);
                        const name = this.value.slice(this.id.length, this.value.length);
                        let sendConfirm = confirm(`確定要呼叫 ${cls}-${num} ${name}？`)
                        if (sendConfirm) {
                            WS.send(JSON.stringify({
                                "type": "CALL_FOR_STUDENT",
                                "targetClassNo": targetClsNo,
                                "students": {
                                    "classNo": cls,
                                    "seatNo": num,
                                    "name": name
                                }

                            }))
                            $("#call-history").prepend(`<div id="hisDiv-${cls}${seatNum}" class="historyDiv"><p>${cls}-${seatNum}${name} <button>撤銷呼叫</button></p> </div>`)
                        }
                    })
                })
            }
        })
        if (data["type"] === "CALL_FOR_STUDENT") {
            const date = new Date();
            const currentTime = date.toLocaleDateString() + " " + date.toLocaleTimeString();
            const studentDic = data["students"];
            console.log(studentDic);
            const clsNum = studentDic["classNo"];
            const seatNum = studentDic["seatNo"];
            const name = studentDic["name"];
            let dupNum = 0
            for (let i = 0 ; document.getElementById("student-call").children.namedItem(`${clsNum}-${seatNum}-${i}`) != null && i === dupNum ; i++) {
                dupNum++;
            }
            setBigBanner(`${clsNum}-${seatNum} ${name}`, currentTime)

            $("#student-call").prepend(`<div id="${clsNum}-${seatNum}-${dupNum}" class="calledDiv"><h2>${clsNum}-${seatNum}${name}</h2><button id="confirmBtn${clsNum}-${seatNum}-${dupNum}" class="btn3" style="margin: 0 auto; text-align: center; display: block" onclick="function confirmBtn() {}">確認</button><p>${currentTime}</p></div>`)
            document.getElementById(`confirmBtn${clsNum}-${seatNum}-${dupNum}`).addEventListener("click", function () {
                    document.getElementById(`${this.id.slice(10, this.id.length)}`).style.borderColor = "#00dc01";
                    this.style.visibility = "hidden";
                }
            )
        }
    }

    $("body").css("background-color", "pink");
    $(".btn").click(function () {
        let classNum = this.id;
        console.log(classNum);
        $("#btnGroup").empty();
        $("#btnGroup").prepend(`<button class="clsBtn" id="classroom-${classNum}">${classNum}教室端</button>`)
        $(".clsBtn").click(function () {
            document.getElementById("called-history").style.visibility = "hidden";
            document.getElementById("call-history").style.visibility = "hidden";
            document.getElementById("call-history").style.height = "0";
            document.getElementById("backtohome").style.visibility = "visible";
            document.getElementById("backtohome").style.padding = "6px 16px";
            document.getElementById("backtohome").style.margin = "auto";
            document.getElementById("backtohome").style.width = "auto";
            $("#identityText").text(`目前身分：${classNum}`);
            console.log(this.id);
            $(".btn").hide();
            $("#btnGroup").hide();
            WS.send(JSON.stringify({
                "type": "INIT",
                "classNo": parseInt(this.id.slice(this.id.indexOf("-") + 1, this.id.length))
            }))
        })
    })

})

document.getElementById("called-history").addEventListener("click", function () {
    console.log(document.getElementById("call-history").checkVisibility({visibilityProperty: true}))
    if (document.getElementById("call-history").checkVisibility({visibilityProperty: true}) === false) {
        document.getElementById("call-history").style.visibility = "visible";
        document.getElementById("call-history").style.height = "auto";
    }
    else if (document.getElementById("call-history").checkVisibility({visibilityProperty: false}) === true) {
        document.getElementById("call-history").style.visibility = "hidden";
        document.getElementById("call-history").style.height = "0";
    }
})

$("#clearStorageUrl").on("click", function () {
    window.localStorage.removeItem("wsUrl");
    configServerUrl();
    window.location.reload();
})

function configServerUrl() {
    const storage = window.localStorage;
    let wsUrl = storage.getItem("wsUrl");
    if (wsUrl === null) {
        wsUrl = prompt("請輸入伺服器端的 IP 及端口 (如：ws://localhost:8001)");
        storage.setItem("wsUrl", wsUrl);
    }

    if (wsUrl === null) {
        return configServerUrl();
    }
    return wsUrl;
}

function setBigBanner(student, timestamp) {
    const banner = $("#student-call-banner")
    const randomId = guidGenerator()
    banner.prepend(`<div class="bigBannerDiv" id="${randomId}"><h1>${student}</h1><h3>${timestamp}</h3></div>`)
    const studentObj = $(`#${randomId}`)
    console.log(studentObj)
    setTimeout(function () {studentObj.fadeOut()}, 5000)
}

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function guidGenerator() {
    let S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}
