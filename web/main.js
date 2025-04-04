const normalSound = new Audio("audio/notify.wav");
const warningSound = new Audio("audio/warning.wav");
document.getElementById("call-history").style.visibility = "hidden";
document.getElementById("call-history").style.height = "0";
let isFullScreen = false;

$(document).ready(function () {
    console.info("Document is \"READY\"")
    let wsStatus = false;
    let wsUrl = configServerUrl(wsStatus)
    let WS = new WebSocket(wsUrl);

    $("#wsUrlDisplay").text(wsUrl);

    WS.onopen = function () {
        $("#wsUrlDisplay").css("color", "green");
        WS.send(JSON.stringify({
            "type": "INIT",
            "classNo": "777"
        }))
        wsStatus = true;
    }

    WS.onerror = function (e) {
        console.error(e);
        alert("與伺服器連接失敗。請嘗試重新整理網頁，或檢查伺服器位址是否正確。");
        $("#wsUrlDisplay").css("color", "red");
        wsStatus = false;
    }

    WS.onclose = function (e) {
        if (e.code > 1001 && e.code !== 1006) {
            alert(`與伺服器的連線中斷。請嘗試重新整理網頁，或檢查伺服器位址是否正確。\n錯誤代碼：${e.code}`)
        }
        $("#wsUrlDisplay").css("color", "red");
        wsStatus = false;
    }


    WS.onmessage = function (event) {
        console.info(event.data);
        const data = JSON.parse(event.data);
        // skip "CALLBACK" data
        if (data["type"] === "CALLBACK") {
            return;
        }
        let clsArray = null;
        try {
            clsArray = data["students"];
        } catch (e) {
            console.log(data)
            return;
        }
        // generate class buttons by using "clsArray"
        let lastGradeNo = 0;
        let classBtnContainer = $("#class-btn");
        $.each(clsArray, function (index, value) {
            const currentGradeNo = parseInt(index.slice(0, 1));
            if (currentGradeNo % 2 === 1) {  // 1, 3, 5
                if (lastGradeNo !== currentGradeNo) {
                    classBtnContainer.append(
                        `<div class="classBtnLine" id="btnL-${currentGradeNo}-${currentGradeNo+1}"></div><br>`
                    )
                    let btnLineContainer = $(`#btnL-${currentGradeNo}-${currentGradeNo+1}`);
                    btnLineContainer.append(
                        `<div class="btnGroupL" id="G${currentGradeNo}"></div>`
                    )
                }
            } else {  // 2, 4, 6
                if (lastGradeNo !== currentGradeNo) {
                    let btnLineContainer = $(`#btnL-${currentGradeNo-1}-${currentGradeNo}`);
                    btnLineContainer.append(
                        `<div class="btnGroupR" id="G${currentGradeNo}"></div>`
                    )
                }
            }
            lastGradeNo = currentGradeNo
            let btnGroupContainer = $(`#G${currentGradeNo}`)
            btnGroupContainer.append(
                `<button class="classNoBtn" id="${index}">${index}</button>`
            )
        }
        )

        $(".classNoBtn").on("click", function () {
            const targetClsNo = this.id;
            const studentArray = clsArray[targetClsNo]
            $("#btnGroup").empty();
            if (data["type"] === "STUDENT_LIST") {
                $.each(studentArray, function (index, value) {
                    console.log(value);
                    const clsNum = value["classNo"];
                    const seatNum = value["seatNo"];
                    const name = value["name"];
                    const btnMode = document.createElement("input");
                    btnMode.type = "button";
                    btnMode.id = formatStudentString(clsNum, seatNum, null);
                    btnMode.className = "btn2";
                    btnMode.value = formatStudentString(clsNum, seatNum, name);
                    $("#btnGroup").append(btnMode);
                    $(`#${formatStudentString(clsNum, seatNum, null)}`).click(function () {
                        const cls = this.id.slice(0, this.id.indexOf("-"));
                        const num = this.id.slice(this.id.indexOf("-") + 1, this.id.length);
                        const name = this.value.slice(this.id.length, this.value.length);
                        let sendConfirm = confirm(`確定要呼叫 ${formatStudentString(cls, num, name)}？`)
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
                            let dupNum = 0
                            for (let i = 0; document.getElementById("student-call").children.namedItem(`${formatStudentString(cls, num, name)}-${i}`) != null && i === dupNum; i++) {
                                dupNum++;
                            }
                            if (document.getElementById("call-history").children.namedItem(`hisDiv-${cls}${num}`) === null) {
                                const time = new Date();
                                const currentTime = time.toLocaleDateString() + " " + time.toLocaleTimeString();
                                historyBtn(WS, targetClsNo, cls, num, name, currentTime)
                            } else {
                                const time = new Date();
                                const currentTime = time.toLocaleDateString() + " " + time.toLocaleTimeString();
                                if (document.getElementById(`hisDiv-${cls}${num}`) != null) {
                                    document.getElementById(`hisDiv-${cls}${num}`).remove();
                                    historyBtn(WS, targetClsNo, cls, num, name, currentTime)
                                }
                            }
                        }
                    })
                })
            }
            let classNum = this.id;
            console.log(classNum)
            $("#btnGroup").prepend(`<button class="mdc-button mdc-button--raised clsBtn" id="classroom-${classNum}" style="font-weight: bold">${classNum} 教室端</button><br>`)
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
                $(".classNoBtn").hide();
                $("#btnGroup").hide();
                WS.send(JSON.stringify({
                    "type": "INIT",
                    "classNo": this.id.slice(this.id.indexOf("-") + 1, this.id.length)
                }))
            })
        })
        if (data["type"] === "CALL_FOR_STUDENT") {
            const time = new Date();
            const currentTime = time.toLocaleDateString() + " " + time.toLocaleTimeString();
            const studentDic = data["students"];
            console.log(studentDic);
            const clsNum = studentDic["classNo"];
            const seatNum = studentDic["seatNo"];
            const name = studentDic["name"];
            let dupNum = 0
            for (let i = 0; document.getElementById("student-call").children.namedItem(`${clsNum}-${seatNum}-${i}`) != null && i === dupNum; i++) {
                dupNum++;
            }
            setBigBanner(`${formatStudentString(clsNum, seatNum, name)}`, currentTime)

            $("#student-call").prepend(`<div id="${formatStudentString(clsNum, seatNum, null)}-${dupNum}" class="calledDiv${formatStudentString(clsNum, seatNum, null)}"><h2 id="calledTitle${formatStudentString(clsNum, seatNum, null)}">${formatStudentString(clsNum, seatNum, name)}</h2><p id="btnText${formatStudentString(clsNum, seatNum, null)}-${dupNum}"><button id="confirmBtn${formatStudentString(clsNum, seatNum, null)}-${dupNum}" class="btn3" style="margin: 0 auto; text-align: center; display: block" onclick="function confirmBtn() {}">確認</button></p><p id="calledTime${formatStudentString(clsNum, seatNum, null)}">${currentTime}</p></div>`)
            document.getElementById(`confirmBtn${formatStudentString(clsNum, seatNum, null)}-${dupNum}`).addEventListener("click", function () {
                    this.style.visibility = "hidden";
                    document.getElementById(`${this.id.slice(10, this.id.length)}`).style.borderColor = "#00dc01";
                    document.getElementById(`btnText${this.id.slice(10, this.id.length)}`).textContent = "已確認！！"
                    const btnTextStyle = document.getElementById(`btnText${this.id.slice(10, this.id.length)}`).style;
                    btnTextStyle.fontSize = "20px";
                    btnTextStyle.fontWeight = "bold";
                    btnTextStyle.color = "#000000";
                    btnTextStyle.height = "30px";
                }
            )
            normalSound.play();
            normalSound.currentTime = 0;
        } else if (data["type"] === "UNDO") {
            const time = new Date();
            const currentTime = time.toLocaleDateString() + " " + time.toLocaleTimeString();
            const studentDic = data["student"];
            const clsNum = studentDic["classNo"];
            const seatNum = studentDic["seatNo"];
            const name = studentDic["name"];
            document.getElementById("student-call").childNodes.forEach(function (value, key, parent) {
                if (new RegExp(`${formatStudentString(clsNum, seatNum, null)}-*`).test(value.id)) {
                    value.style.borderColor = "#ffe600";
                    value.childNodes.item(0).style.textDecoration = "line-through";
                    const btnText = value.childNodes.item(1);
                    btnText.textContent = "呼叫錯誤！！";
                    btnText.style.color = "#ff0000";
                    btnText.style.fontWeight = "bold";
                    btnText.style.fontSize = "20px";
                    btnText.style.height = "34px";
                    btnText.style.margin = "0 auto";
                    if (btnText.childNodes.item(0).nodeName === "button") {
                        btnText.childNodes.item(0).style.visibility = "hidden";
                    }
                    value.childNodes.item(2).style.textDecoration = "line-through";
                }
            });
            setUndoBanner(`${formatStudentString(clsNum, seatNum, name)}`, currentTime)
            warningSound.play()
            warningSound.currentTime = 0
        }
    }

    document.getElementById("submitBtn").addEventListener("click", function () {
        const value = removeUnwantedChars(document.getElementById("searchBar").value);
        WS.send(JSON.stringify({
            "type": "SEARCH",
            "criteria": [
                value.split(" ")
            ]
        }))
        console.log(value.split(" "))
        // const value = replaceSymbols(document.getElementById("searchBar").value);
        // let classNo = null;
        // let seatNo = null;
        // let name = null;
        // let run = false;
        // if (isAllChinese(value)){ //王大明
        //     name = value;
        //     run = true;
        // }
        // else if (countDigits(value) >= 4 && countDigits(value) <= 6 && hasChinese(value)){ //1015王大明 or 10105王大明
        //     classNo = value.slice(0,3);
        //     seatNo = value.slice(3,countDigits(value));
        //     name = value.slice(countDigits(value), value.length);
        //     run = true;
        // }
        // else if (countDigits(value) >= 4 && countDigits(value) <= 6 && !hasChinese(value)){ //1015 or 10105
        //     classNo = value.slice(0,3);
        //     seatNo = value.slice(3,countDigits(value));
        //     run = true;
        // }
        // else if (countDigits(value) === 3 && hasChinese(value)){ //101王大明
        //     classNo = value.slice(0,3);
        //     name = value.slice(countDigits(value), value.length);
        //     run = true;
        // }
        // else if (countDigits(value) <= 2 && countDigits(value) > 0 && hasChinese(value)) { //5王大明 or 05王大明
        //     seatNo = value.slice(0,2);
        //     name = value.slice(countDigits(value), value.length);
        //     run = true;
        // }
        // else {
        //     run = false;
        // }
        // if (run) {
        //     console.log(classNo + name + seatNo);
        //     WS.send(JSON.stringify({
        //         "type": "SEARCH",
        //         "criteria": [
        //             classNo, seatNo, name
        //         ]
        //     }))
        // }
    })

    document.getElementById("teacherLogin").addEventListener("click", function () {
        const password = prompt("請輸入密碼：")
        WS.send(JSON.stringify({
            "type": "PASSWORD",
            "value": password
        }))
    })
})



document.getElementById("called-history").addEventListener("click", function () {
    let historyDiv = document.getElementById("call-history");
    let historyBtn = document.getElementById("called-history");
    if (historyDiv.checkVisibility({visibilityProperty: true}) === false) {
        historyDiv.style.visibility = "visible";
        historyDiv.style.height = "auto";
        historyBtn.textContent = "X";
        historyBtn.style.backgroundColor = "#ff0000";
    } else if (historyDiv.checkVisibility({visibilityProperty: false}) === true) {
        historyDiv.style.visibility = "hidden";
        historyDiv.style.height = "0";
        historyBtn.textContent = "呼叫歷史";
        historyBtn.style.backgroundColor = "#3f51b5";
    }
})

$("#clearStorageUrl").on("click", function () {
    window.localStorage.removeItem("wsUrl");
    configServerUrl();
    window.location.reload();
})

function historyBtn(WS, targetClsNo, cls, num, name, currentTime) {
    $("#call-history").prepend(`<div id="hisDiv-${cls}${num}" class="historyDiv"><p style="height: 34px;margin:4px 0 0 0">${cls}-${num}${name} <button class="btn3" id="historyBtn${cls}-${num}">撤銷呼叫</button></p><p style="font-size: 10px; height: 10px;margin: 0">上次呼叫時間：</p><p id="historyTime${cls}-${num}" style="font-size: 10px; height: 10px;margin: 0 0 3px 0">${currentTime}</p> </div>`)
    document.getElementById(`historyBtn${cls}-${num}`).addEventListener("click", function () {
        let sendConfirm = confirm(`確定要撤銷 ${formatStudentString(cls, num, name)} 的呼叫？`)
        if (sendConfirm) {
            document.getElementById(`hisDiv-${cls}${num}`).remove();
            WS.send(JSON.stringify({
                "type": "UNDO",
                "targetClassNo": targetClsNo,
                "student": {
                    "classNo": cls,
                    "seatNo": num,
                    "name": name
                }
            }))
        }
    })
}

function configServerUrl(status) {
    const storage = window.localStorage;
    let wsUrl = storage.getItem("wsUrl");
    if (wsUrl === null) {
        wsUrl = prompt("請輸入伺服器端的 IP 及端口 (如：ws://localhost:8001)");
        storage.setItem("wsUrl", wsUrl);
    } else if (status === false && wsUrl != null) {
        wsUrl = `ws://${document.location.hostname}:8001`;
        storage.setItem("wsUrl", wsUrl);
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
    setTimeout(function () {
        studentObj.fadeOut()
    }, 5000)
}

function setUndoBanner(student, timestamp) {
    const banner = $("#student-call-banner")
    const randomId = guidGenerator()
    banner.prepend(`<div class="undoBannerDiv" id="${randomId}"><h1 style="color: #ff0000">有一則錯誤呼叫！！</h1><h2>${student}</h2><h5>${timestamp}</h5></div>`)
    const studentObj = $(`#${randomId}`)
    console.log(studentObj)
    setTimeout(function () {
        studentObj.fadeOut()
    }, 10000)
}

function formatStudentString(classNo, seatNo, name) {
        if (name === null) {
            name = ""
        } else {
            name = " " + name
        }
        if (!(typeof seatNo === "string") && seatNo < 10) {
            return `${classNo}-0${seatNo}${name}`
        }
        return `${classNo}-${seatNo}${name}`
}

function fullScreen(element) {
    document.fullscreenEnabled = document.fullscreenEnabled || document.mozFullScreenEnabled || document.documentElement.webkitRequestFullScreen;
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    fullscreenBtn.childNodes.item(0).src = "image/fullscreen-exit.svg";
    //fullscreenBtn.append("<img src=\"image/fullscreen-exit.svg\" alt=\"full screen-exit\" height=\"30\">")
    if(window.innerHeight !== screen.height) {
        if (element.requestFullscreen && isFullScreen === false) {
            element.requestFullscreen();
            isFullScreen = true;
        } else if (element.mozRequestFullScreen && isFullScreen === false) {
            element.mozRequestFullScreen();
            isFullScreen = true;
        } else if (element.webkitRequestFullScreen && isFullScreen === false) {
            element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            isFullScreen = true;
        }
        else if (isFullScreen) {
            closeFullscreen()
            fullscreenBtn.childNodes.item(0).src = "image/fullscreen.svg";
        }
    }
}

function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
        isFullScreen = false;
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
        isFullScreen = false;
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
        isFullScreen = false;
    }
}

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function guidGenerator() {
    let S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function isAllChinese(str) {
    return /^[\u4e00-\u9fff]+$/.test(str);
}

function countDigits(str) {
    const match = str.match(/\d/g); // \d 代表數字，g 表示全域匹配
    return match ? match.length : 0;
}

function hasChinese(str) {
    return /[\u4e00-\u9fff]/.test(str);
}

function replaceSymbols(str) {
    if (/[^\w\s]/.test(str)){
        return str.replace(/[^\w\s]/g, '');
    }
    else {
        return str;
    }
}

function removeUnwantedChars(str) {
    return str.replace(/[^\d\u4e00-\u9fa5\s]/g, '');
}