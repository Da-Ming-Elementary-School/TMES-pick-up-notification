$(document).ready(function () {
    const WS = new WebSocket("ws://localhost:8001");


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