let WS = null;

let STUDENT_DATA = {}
let CLASSROOM_DATA = {}
let EDITOR_DATA = {}

document.addEventListener("DOMContentLoaded", () => {
    const wsUrl = window.localStorage.getItem("wsUrl") || `ws://${window.location.hostname}:8001`
    WS = new WebSocket(wsUrl);

    const wsUrlDisplay = document.getElementById('ws-url-display');
    wsUrlDisplay.textContent = wsUrl
    wsUrlDisplay.style.color = 'gray';

    WS.onopen = () => {
        console.log(`WS connected to ${WS.url}`);
        WS.send(JSON.stringify(
            {
                "type": "INIT",
                "classNo": "admin"
            }
        ));
        wsUrlDisplay.style.color = 'green';
    }

    WS.onclose = (event) => {
        wsUrlDisplay.style.color = 'red';
        if (event.code !== 1000) {
            console.error(`WS connection closed: ${event.code}`);
        }
    }

    WS.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(data)
        if (data["type"] === "CALLBACK") {
            if (data["success"] === true) {
                document.getElementById("upload-confirm").style.visibility = "hidden";
                const doReload = confirm(`已儲存 ${EDITOR_DATA["classNo"]} 的資料！是否立即重整以反映變更？`);
                if (doReload) {
                    window.location.reload();
                }
            }
        }
        if (data["type"] === "STUDENT_LIST") {
            STUDENT_DATA = data["students"]
            CLASSROOM_DATA = data["classrooms"]
            const classSelector = document.getElementById("class-selector")
            for (const [k, v] of Object.entries(STUDENT_DATA)) {
                let classOption = document.createElement("option")
                classOption.text = `${k} (${data["classrooms"][k]})`
                classOption.value = k
                classSelector.add(classOption)
            }
        } else if (data["type"] === "ERROR") {
            alert(`輸入的密碼錯誤。\n錯誤訊息：${data["message"]}`);
        }
    }
})

document.getElementById("class-select").addEventListener("change", (event) => {
    const changesCount = calculateChanges()
    const classNo = event.target.value
    if (EDITOR_DATA["classNo"] !== classNo && (changesCount["edit"] !== 0 || changesCount["delete"] !== 0)) {
        const doContinue = confirm(`目前尚有未上傳的變更。\n是否放棄對 ${EDITOR_DATA["classNo"]} 的變更，並切換班級至 ${classNo}？`)
        if (!doContinue) {
            event.target.value = EDITOR_DATA["classNo"]
            return
        }
    }
    const classDataDiv = document.getElementById("class-data-editor")
    const studentList = STUDENT_DATA[classNo]
    const studentTable = document.getElementById("student-table");
    classDataDiv.style.visibility = "hidden";
    document.getElementById("classroom-input").value = CLASSROOM_DATA[classNo];
    document.getElementById("class-id-title").textContent = `課托班 ${classNo} 的資料`;
    cleanTable(studentTable)
    EDITOR_DATA = {"classNo": classNo, "classroom": {"before": CLASSROOM_DATA[classNo]}}
    for (const student of studentList) {
        addRow(studentTable, student)
    }
    onClassroomEdited()
    classDataDiv.style.visibility = "visible";
})

document.getElementById("classroom-input").addEventListener("change", onClassroomEdited)

function onClassroomEdited() {
    const classroomDiv = document.getElementById("classroom-div")
    const classroomInput = document.getElementById("classroom-input")
    if (classroomInput.value !== EDITOR_DATA["classroom"]["before"]) {
        EDITOR_DATA["classroom"]["after"] = classroomInput.value
        classroomDiv.style.backgroundColor = "#f5ffb6"
    } else {
        delete EDITOR_DATA["classroom"]["after"]
        classroomDiv.style.backgroundColor = null
    }
}

document.getElementById("csv-file-input").addEventListener("change", (event) => {
    const file = event.target.files[0]
    const doContinue = confirm(`匯入 CSV 將取代此班級目前的所有資料。是否確定匯入 ${file.name}？`)
    if (!doContinue) {
        event.target.value = null
        return
    }
    const studentTable = document.getElementById("student-table");
    const classNo = document.getElementById("class-selector").value
    cleanTable(studentTable)
    Papa.parse(file,
        {
            complete: (result) => {
                console.log(result)
                const rawData = result["data"]
                const classroom = rawData[1][3] || ""
                EDITOR_DATA = {"classNo": classNo, "classroom": {"after": classroom}}
                document.getElementById("classroom-input").value = classroom
                onClassroomEdited()
                for (let i = 0; i < rawData.length; i++) {
                    const row = rawData[i]
                    if (i === 0) {
                        continue
                    }
                    addRow(studentTable, {
                        "classNo": row[0],
                        "seatNo": row[1],
                        "name": row[2],
                    }, true)
                }
            },
            dynamicTyping: true,
            skipEmptyLines: true,
        })
})

document.getElementById("create-student-button").addEventListener("click", () => {
    const studentId = addRow(document.getElementById("student-table"))
    document.getElementById(`editBtn-${studentId}`).click()
})

document.getElementById("upload-button").addEventListener("click", () => {
    const edits = calculateChanges()
    if (edits["edit"] === 0 && edits["delete"] === 0) {
        alert("目前尚無任何變更。請進行編輯 / 刪除 / 新增後再行上傳。")
    } else {
        document.getElementById("upload-confirm").style.visibility = "visible"
    }
})

document.getElementById("cancel-password-button").addEventListener("click", () => {
    document.getElementById("upload-confirm").style.visibility = "hidden"
})

document.getElementById("submit-password-button").addEventListener("click", () => {
    const newData = {
        "classroom": EDITOR_DATA["classroom"]["after"] || EDITOR_DATA["classroom"]["before"],
        "students": []
    }
    for (const [k, v] of Object.entries(EDITOR_DATA)) {
        if (k === "classroom" || k === "classNo") {
            continue;
        }
        if ("after" in v) {
            if (v["after"] !== null) {
                newData["students"].push(v["after"])
            }
        } else {
            if (!dataIsTheSame(v["before"], {
                "classNo": "",
                "seatNo": "",
                "name": ""
            }))
                newData["students"].push(v["before"])
        }
    }
    console.log(newData)
    const editedData = {
        "type": "EDIT",
        "password": btoa(document.getElementById("upload-password-input").value),
        "classNo": EDITOR_DATA["classNo"],
        "newData": newData
    }
    console.log(editedData)
    WS.send(JSON.stringify(editedData))
})

function addRow(table, student, isImported) {
    isImported = isImported || false
    let studentId;
    if (student === undefined || student === null) {
        studentId = guidGenerator()
        student = {
            "classNo": "",
            "seatNo": "",
            "name": ""
        }
    } else {
        studentId = formatStudentId(student["classNo"], student["seatNo"])
    }
    const newRow = table.insertRow()
    if (isImported) {
        EDITOR_DATA[studentId] = {"after": student}
        newRow.style.backgroundColor = "#f5ffb6"
    } else {
        EDITOR_DATA[studentId] = {"before": student}
    }
    newRow.id = `row-${studentId}`
    const classNoInput = document.createElement("input")
    classNoInput.type = "number"
    classNoInput.disabled = true
    classNoInput.required = true
    classNoInput.value = student["classNo"]
    const seatNoInput = document.createElement("input")
    seatNoInput.type = "number"
    seatNoInput.disabled = true
    seatNoInput.required = true
    seatNoInput.value = student["seatNo"]
    const nameInput = document.createElement("input")
    nameInput.type = "text"
    nameInput.disabled = true
    nameInput.required = true
    nameInput.value = student["name"]
    newRow.insertCell().appendChild(classNoInput)
    newRow.insertCell().appendChild(seatNoInput)
    newRow.insertCell().appendChild(nameInput)
    const btnCell = newRow.insertCell()
    btnCell.className = "btn-cell"
    btnCell.style.textAlign = "center"
    const editBtn = document.createElement("button")
    editBtn.id = `editBtn-${studentId}`
    editBtn.className = "action-btn"
    editBtn.textContent = "編輯"
    editBtn.addEventListener("click", () => {
        editStudent(studentId)
    })
    const saveBtn = document.createElement("button")
    saveBtn.id = `saveBtn-${studentId}`
    saveBtn.className = "action-btn"
    saveBtn.textContent = "儲存"
    saveBtn.disabled = true
    saveBtn.addEventListener("click", () => {
        saveStudent(studentId)
    })
    const deleteBtn = document.createElement("button")
    deleteBtn.id = `deleteBtn-${studentId}`
    deleteBtn.className = "action-btn"
    deleteBtn.textContent = "刪除"
    deleteBtn.addEventListener("click", () => {
        deleteStudent(studentId)
    })
    btnCell.appendChild(editBtn)
    btnCell.appendChild(saveBtn)
    btnCell.appendChild(deleteBtn)

    return studentId
}

function cleanTable(table) {
    const rowCount = table.rows.length
    for (let i = 0; i < (rowCount - 1); i++) {
        table.deleteRow(-1);
    }
}

function editStudent(studentId) {
    const row = document.getElementById(`row-${studentId}`)
    for (const cell of row.cells) {
        if (cell.className === "btn-cell") {
            continue;
        }
        cell.childNodes[0].disabled = false
    }
    document.getElementById(`editBtn-${studentId}`).disabled = true
    document.getElementById(`saveBtn-${studentId}`).disabled = false
}

function saveStudent(studentId) {
    const row = document.getElementById(`row-${studentId}`)
    row.cells[2].childNodes[0].value = row.cells[2].childNodes[0].value.replaceAll(" ", "")
    for (const cell of row.cells) {
        if (cell.className === "btn-cell") {
            continue;
        }
        if (cell.childNodes[0].value === "") {
            alert("所有欄位皆須輸入值！")
            return
        }
    }
    for (const cell of row.cells) {
        if (cell.className === "btn-cell") {
            continue;
        }
        cell.childNodes[0].disabled = true
    }
    const newData = {
        "classNo": parseInt(row.cells[0].childNodes[0].value),
        "seatNo": parseInt(row.cells[1].childNodes[0].value),
        "name": row.cells[2].childNodes[0].value
    }
    if (!dataIsTheSame(EDITOR_DATA[studentId]["before"], newData)) {
        EDITOR_DATA[studentId]["after"] = newData
        row.style.backgroundColor = "#f5ffb6"
    } else {
        delete EDITOR_DATA[studentId]["after"]
        row.style.backgroundColor = null
    }
    document.getElementById(`editBtn-${studentId}`).disabled = false
    document.getElementById(`saveBtn-${studentId}`).disabled = true
}

function deleteStudent(studentId) {
    const row = document.getElementById(`row-${studentId}`)
    for (const cell of row.cells) {
        if (cell.className === "btn-cell") {
            continue;
        }
        cell.childNodes[0].disabled = true
    }
    if (EDITOR_DATA[studentId]["after"] !== null) {
        EDITOR_DATA[studentId]["after"] = null
        row.style.backgroundColor = "#ffb6b6"
    } else {
        delete EDITOR_DATA[studentId]["after"]
        row.style.backgroundColor = null
    }
    document.getElementById(`editBtn-${studentId}`).disabled = false
    document.getElementById(`saveBtn-${studentId}`).disabled = true
}

function calculateChanges() {
    let result = {"edit": 0, "delete": 0}
    for (const [k, v] of Object.entries(EDITOR_DATA)) {
        if (k === "classNo") {
            continue;
        }
        if ("after" in v) {
            if (v["after"] !== null) {
                result["edit"]++
            } else if (v["after"] === null && k.length < 6) {
                result["delete"]++
            }
        }
    }
    console.log(`${result["edit"]} edits and ${result["delete"]} deletions are made.`)
    return result
}

function dataIsTheSame(data1, data2) {
    return (data1["classNo"] === data2["classNo"]
        && data1["seatNo"] === data2["seatNo"]
        && data1["name"] === data2["name"])
}

function formatStudentId(classNo, seatNo) {
    if (seatNo < 10) {
        return `${classNo}0${seatNo}`
    } else {
        return `${classNo}${seatNo}`
    }
}

function guidGenerator() {
    let S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
