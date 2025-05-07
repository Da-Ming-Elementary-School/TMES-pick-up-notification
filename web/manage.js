let STUDENT_DATA = {}
let CLASSROOM_DATA = {}
let EDITOR_DATA = {}

document.addEventListener("DOMContentLoaded", () => {
    const wsUrl = window.localStorage.getItem("wsUrl") || `ws://${window.location.hostname}:8001`
    const ws = new WebSocket(wsUrl);

    const wsUrlDisplay = document.getElementById('ws-url-display');
    wsUrlDisplay.textContent = wsUrl
    wsUrlDisplay.style.color = 'gray';

    ws.onopen = () => {
        console.log(`WS connected to ${ws.url}`);
        ws.send(JSON.stringify(
            {
                "type": "INIT",
                "classNo": "admin"
            }
        ));
        wsUrlDisplay.style.color = 'green';
    }

    ws.onclose = (event) => {
        wsUrlDisplay.style.color = 'red';
        if (event.code !== 1000) {
            console.error(`WS connection closed: ${event.code}`);
        }
    }

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data["type"] === "CALLBACK") {
            return;
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
        }
    }
})

document.getElementById("class-select").addEventListener("change", (event) => {
    const classDataDiv = document.getElementById("class-data")
    const classNo = event.target.value
    const studentList = STUDENT_DATA[classNo]
    const studentTable = document.getElementById("student-table");
    classDataDiv.style.visibility = "hidden";
    document.getElementById("classroom-input").value = CLASSROOM_DATA[classNo];
    document.getElementById("class-id-title").textContent = `課托班 ${classNo} 的資料`;
    const rowCount = studentTable.rows.length
    for (let i = 0; i < (rowCount - 1); i++) {
        studentTable.deleteRow(-1);
    }
    EDITOR_DATA = {}
    for (const student of studentList) {
        const studentId = formatStudentId(student["classNo"], student["seatNo"])
        EDITOR_DATA[studentId] = {"before": student}
        const newRow = studentTable.insertRow()
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
    }
    classDataDiv.style.visibility = "visible";
})

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