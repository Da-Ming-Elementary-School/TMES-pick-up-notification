buildPWAJson(document.location.hash.slice(1))

const normalSound = new Audio("audio/notify.wav");
const warningSound = new Audio("audio/warning.wav");
document.getElementById("call-history").style.visibility = "hidden";
document.getElementById("call-history").style.height = "0";
document.getElementById("searchResult").style.visibility = "hidden";
document.getElementById("searchResult").style.height = "0";
document.getElementById("teacherLogin").style.visibility = "hidden";
document.getElementById("teacherLogin").style.width = "0";
document.getElementById("history-search-container").style.visibility = "hidden";
document.getElementById("history-search-container").addEventListener("input", function () {
    let dupNum = 0
    let id = "";
    if (document.getElementById("history-search-container").hidden === false) {
        for (let i = 0; document.getElementsByClassName("historyDiv").item(i) != null || dupNum === i; i++) {
            dupNum = i;
            id = document.getElementsByClassName("historyDiv").item(dupNum).id;
            let input = removeUnwantedChars(document.getElementById("history-searchBar").value)
            if (id.slice(id.indexOf("-") + 1, id.length - 4) === input || id.slice(id.indexOf("-") + 1, id.length - 3) === input || id.slice(id.indexOf("-") + 1, id.length - 2) === input || id.slice(id.indexOf("-") + 1, id.length - 1) === input || id.slice(id.indexOf("-") + 1, id.length) === input) {
                document.getElementById(id).removeAttribute("style");
                console.log(id);
                console.log(id.slice(id.indexOf("-") + 1, id.length - 2));
                console.log("a")
                console.log(input)
            } else if (input === "") {
                document.getElementById(id).removeAttribute("style");
            } else {
                document.getElementById(id).style.visibility = "hidden";
                document.getElementById(id).style.height = "0";
                document.getElementById(id).style.width = "0";
                document.getElementById(id).style.margin = "0";
                document.getElementById(id).style.padding = "0";
                console.log(id);
                console.log(id.slice(id.indexOf("-") + 1, id.length - 2));
                console.log(input)
            }
        }
    }
})
let isFullScreen = false;


$(document).ready(function () {
    let wsStatus = false;
    let wsUrl = configServerUrl(wsStatus)
    let WS = new WebSocket(wsUrl);
    console.info("Document is \"READY\"")

    $("#wsUrlDisplay").text(wsUrl);
    WS.onopen = function () {
        $("#wsUrlDisplay").css("color", "green");
        initToClassroomClient(WS)

        $(window).on('hashchange', function () {
            initToClassroomClient(WS)
        });
        wsStatus = true;

    }

    WS.onerror = function (e) {
        console.error(e);
        alert("與伺服器連接失敗。請嘗試重新整理網頁，或檢查伺服器位址是否正確。");
        $("#wsUrlDisplay").css("color", "red");
        wsStatus = false;
    }

    WS.onclose = function (e) {
        if (e.code > 1001 && wsStatus) {
            alert(`與伺服器的連線中斷。請嘗試重新整理網頁，或檢查伺服器位址是否正確。\n錯誤代碼：${e.code}`)
        }
        $("#wsUrlDisplay").css("color", "red");
        wsStatus = false;
    }


    WS.onmessage = function (event) {
        const data = JSON.parse(event.data);
        // skip "CALLBACK" data
        if (data["type"] === "CALLBACK") {
            return;
        }
        if (data["type"] === "STUDENT_LIST") {
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
                                `<div class="classBtnLine" id="btnL-${currentGradeNo}-${currentGradeNo + 1}"></div><br>`
                            )
                            let btnLineContainer = $(`#btnL-${currentGradeNo}-${currentGradeNo + 1}`);
                            btnLineContainer.append(
                                `<div class="btnGroupL" id="G${currentGradeNo}"></div>`
                            )
                        }
                    } else {  // 2, 4, 6
                        if (lastGradeNo !== currentGradeNo) {
                            let btnLineContainer = $(`#btnL-${currentGradeNo - 1}-${currentGradeNo}`);
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
                const btnGroup = $("#btnGroup");
                const targetClsNo = this.id;
                const studentArray = clsArray[targetClsNo]
                btnGroup.empty();
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
                                historyBtn(WS, targetClsNo, cls, num, name);
                                showBanner("successBox");
                            }
                        })
                    })
                }
                let classNum = this.id;
                console.log(classNum)
                btnGroup.prepend(`<a href="${location.origin}${location.pathname}#${classNum}"  class="mdc-button mdc-button--raised clsBtn" id="classroom-${classNum}" style="font-weight: bold">${classNum} 教室端</a><br>`)
            })
        } else if (data["type"] === "CALL_FOR_STUDENT") {
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
        } else if (data["type"] === "SEARCH_RESULT") {
            const results = data["results"];
            if (results.length < 1) {
                showBanner("failedBox");
            } else {
                document.getElementById("searchResult").style.visibility = "visible";
                document.getElementById("searchResult").style.height = "auto";
                document.getElementById("searchText").innerText = `查詢到 ${results.length} 則結果！`
                showBanner("searchBox");
                $.each(results, function (index, value) {
                    const targetClassNo = value["targetClassNo"];
                    const student = value["student"];
                    const classNo = student["classNo"];
                    const seatNo = student["seatNo"];
                    const name = student["name"];
                    const optMode = document.createElement("option");
                    optMode.value = classNo + "-" + seatNo;
                    optMode.id = name;
                    optMode.className = targetClassNo;
                    optMode.text = formatStudentString(classNo, seatNo, name) + ` (${targetClassNo})`;
                    document.getElementById("resultSelect").append(optMode);
                })
                let select = document.querySelector("#resultSelect");
                select.addEventListener("change", function () {
                    if (select.options[select.selectedIndex].value !== "0") {
                        const targetClass = select.options[select.selectedIndex].className;
                        const student = select.options[select.selectedIndex].value;
                        const sendConfirm = confirm(`確定要呼叫 ${select.options[select.selectedIndex].text}？`);
                        const cls = student.slice(0, student.indexOf("-"));
                        const seatNo = student.slice(student.indexOf("-") + 1, student.length);
                        const name = select.options[select.selectedIndex].id;
                        if (sendConfirm) {
                            WS.send(JSON.stringify({
                                "type": "CALL_FOR_STUDENT",
                                "targetClassNo": targetClass,
                                "students": {
                                    "classNo": cls,
                                    "seatNo": seatNo,
                                    "name": name
                                }
                            }))
                            historyBtn(WS, targetClass, cls, seatNo, name);
                            document.getElementById("searchResult").style.visibility = "hidden";
                            document.getElementById("searchResult").style.height = "0";
                            showBanner("successBox");
                        }
                    }
                })
            }
        } else if (data["type"] === "ERROR") {
            document.getElementById("successBox").classList.remove("show");
            const cls = data["message"];
            alert(`班級 ${cls.toString().slice(7, 9)} 尚未開啟接收端，請以其他方式通知！`)
        } else if (data["type"] === "CONNECTION_STATS") {
            const connectedClassList = data["connected_clients"];
            const classBtns = document.getElementsByClassName("classNoBtn");
            for (let i = 0; i < classBtns.length; i++) {
                classBtns[i].style.backgroundColor = "#b80000";
                classBtns[i].style.fontStyle = "italic";
            }
            for (const classId of connectedClassList) {
                if (classId === "777"){
                    continue;
                }
                console.log(classId + " is alive");
                const btn = document.getElementById(classId);
                btn.style.backgroundColor = "#ea4c89";
                btn.style.fontStyle = "normal";
            }
        }
    }

    document.getElementById("submitBtn").addEventListener("click", function () {
        const value = removeUnwantedChars(document.getElementById("searchBar").value);
        const resultSelect = $("#resultSelect")
        document.getElementById("searchBar").value = value
        resultSelect.empty();
        resultSelect.append("<option value='0' disabled selected>請選擇正確的搜尋結果</option>");
        removeAllListeners(document.querySelector("#resultSelect"), "change");
        if (value !== "") {
            WS.send(JSON.stringify({
                "type": "SEARCH",
                "criteria": value.split(" ")
            }))
        }
    })

    document.getElementById("teacherLogin").addEventListener("click", function () {
        // const password = prompt("請輸入密碼：")
        // WS.send(JSON.stringify({
        //     "type": "PASSWORD",
        //     "value": password
        // }))
    })
})


document.getElementById("called-history").addEventListener("click", calledHistory);
//document.addEventListener("click", calledHistory);

document.getElementById("searchBar").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        document.getElementById("submitBtn").click()
    }
})

$("#clearStorageUrl").on("click", function () {
    window.localStorage.removeItem("wsUrl");
    configServerUrl();
    window.location.reload();
})

function calledHistory() {
    let historyDiv = document.getElementById("call-history");
    let historyBtn = document.getElementById("called-history");
    let historySearchDiv = document.getElementById("history-search-container");
    let historySearch = document.getElementById("history-searchBar");
    if (historyDiv.checkVisibility({visibilityProperty: true}) === false) {
        historyDiv.style.visibility = "visible";
        historyDiv.style.height = "auto";
        historyBtn.textContent = "X";
        historyBtn.style.backgroundColor = "#ff0000";
        historySearchDiv.removeAttribute("style");
    } else if (historyDiv.checkVisibility({visibilityProperty: false}) === true) {
        historySearchDiv.style.visibility = "hidden";
        historySearch.value = "";
        historyDiv.style.visibility = "hidden";
        historyDiv.style.height = "0";
        historyBtn.textContent = "呼叫歷史";
        historyBtn.removeAttribute("style");
        historyBtn.style.fontWeight = "bold";
    }
}


function historyBtn(WS, targetClsNo, cls, num, name) {
    if (document.getElementById(`hisDiv-${cls}${num}`) != null) {
        document.getElementById(`hisDiv-${cls}${num}`).remove();
    }
    const time = new Date();
    const currentTime = time.toLocaleDateString() + " " + time.toLocaleTimeString();
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

$(document).ready(configServerUrl);

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

function initToClassroomClient(WS) {
    const cls = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "3A", "3B", "3C", "3D", "4A", "4B", "4C", "5A", "5B", "5C", "5D", "6A", "6B", "6C"]
    const path = window.location.hash.slice(window.location.hash.length - 2, window.location.hash.length);
    console.log(path);
    if (cls.indexOf(path.toUpperCase()) < "") {
        WS.send(JSON.stringify({
            "type": "INIT",
            "classNo": "777"
        }))
        console.log(path);
    } else if (cls.indexOf(path.toUpperCase()) !== -1) {
        document.getElementById("search-container").style.visibility = "hidden";
        document.getElementById("searchHint").style.visibility = "hidden";
        urlPath(WS);
        console.log(path);
    }
}

function buildPWAJson(classId) {
    fetch("/manifest.json")
        .then(res => res.json())
        .then(manifest => {
            if (classId !== "") {
                manifest.name = `(${classId}) 大明課托呼叫系統`;
                manifest.short_name = classId;
                manifest.start_url = `/index.html#${classId}`
            } else {
                manifest.name = "(教師端) 大明課托呼叫系統";
                manifest.short_name = "教師端";
                manifest.start_url = "./index.html";
            }
            const blob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
            const blobUrl = URL.createObjectURL(blob);

            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = blobUrl;
            document.head.appendChild(manifestLink);
        })
}

function fullScreen(element) {
    document.fullscreenEnabled = document.fullscreenEnabled || document.mozFullScreenEnabled || document.documentElement.webkitRequestFullScreen;
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    fullscreenBtn.childNodes.item(0).src = "image/fullscreen-exit.svg";
    //fullscreenBtn.append("<img src=\"image/fullscreen-exit.svg\" alt=\"full screen-exit\" height=\"30\">")
    if (window.innerHeight !== screen.height) {
        if (element.requestFullscreen && isFullScreen === false) {
            element.requestFullscreen();
            isFullScreen = true;
        } else if (element.mozRequestFullScreen && isFullScreen === false) {
            element.mozRequestFullScreen();
            isFullScreen = true;
        } else if (element.webkitRequestFullScreen && isFullScreen === false) {
            element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            isFullScreen = true;
        } else if (isFullScreen) {
            closeFullscreen()
            fullscreenBtn.childNodes.item(0).src = "image/fullscreen.svg";
        }
    }
}

function closeFullscreen() {
    if (document.fullscreenEnabled) {
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

function removeAllListeners(target, event) {
    let cloned = target.cloneNode(true);
    target.parentNode.replaceChild(cloned, target);
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

function removeUnwantedChars(str) {
    return str.replace(/[^\d\u4e00-\u9fa5\s]/g, '');
}

function showBanner(box) {
    const banner = document.getElementById(box);

    banner.classList.add("show");

    setTimeout(() => {
        banner.classList.remove("show");
    }, 1300);
}

function urlPath(WS) {
    let cls = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "3A", "3B", "3C", "3D", "4A", "4B", "4C", "5A", "5B", "5C", "5D", "6A", "6B", "6C"]
    let path = window.location.hash.slice(window.location.hash.length - 2, window.location.hash.length);
    if (cls.indexOf(path.toUpperCase()) !== -1) {
        const classNum = cls[cls.indexOf(path.toUpperCase())]
        document.getElementById("called-history").style.visibility = "hidden";
        document.getElementById("call-history").style.visibility = "hidden";
        document.getElementById("call-history").style.height = "0";
        document.getElementById("teacherLogin").style.height = "0";
        document.getElementById("teacherLogin").style.visibility = "hidden";
        $("#identityText").text(`目前身分：${classNum}`);
        $(".classNoBtn").hide();
        $("#btnGroup").hide();
        setTimeout(() => {
            WS.send(JSON.stringify({
                "type": "INIT",
                "classNo": classNum
            }), 3000)
        })
    }
}