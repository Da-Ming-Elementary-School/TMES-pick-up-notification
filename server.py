# coding=utf-8
import asyncio
import platform
import ssl
import os
import sys
import time
import psutil
from functools import partial
from json import loads, dumps
from base64 import b64encode
from typing import Literal
import logging
from pprint import pprint
from websockets.asyncio.server import serve, ServerConnection
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK

import logger
import json_assistant

CONNECTED_CLIENTS: dict[str, list[ServerConnection]] = {}
LOGGER = logger.create_logger()
INDEX: dict = {}
BASE_DIR = os.path.dirname(sys.argv[0])
ADMIN_PASSWORD: str = ""
try:
    with open("admin_password.txt") as f:
        ADMIN_PASSWORD = f.read()
except FileNotFoundError:
    ADMIN_PASSWORD = "admin"


def data_is_stored(data) -> tuple[bool, str | None]:
    for k, v in CONNECTED_CLIENTS.items():
        if data in v:
            return True, k
    return False, None


async def send_message(
    data: dict,
    message_type: Literal[
        "INIT",
        "ERROR",
        "CALLBACK",
        "BROADCAST",
        "STUDENT_LIST",
        "CALL_FOR_STUDENT",
        "UNDO",
        "SEARCH_RESULT",
        "CONNECTION_STATS",
        "SERVER_STATS",
    ],
    targets: ServerConnection | list[ServerConnection],
):
    data["type"] = message_type
    data_str = dumps(data)
    if isinstance(targets, ServerConnection):
        targets = [targets]
    for target in targets:
        await target.send(data_str)


async def handler(websocket: ServerConnection):
    global CONNECTED_CLIENTS
    try:
        async for data in websocket:
            # JSON string to dict
            data = loads(data)
            client_id: str = data.get("classNo", -1)
            msg_type: str = data.get("type", "UNKNOWN")
            # process received data
            if msg_type == "INIT":
                client_is_stored, k = data_is_stored(websocket)
                closed = asyncio.ensure_future(websocket.wait_closed())
                rm_ws_bound = partial(remove_ws, websocket)
                closed.add_done_callback(
                    lambda future: asyncio.create_task(rm_ws_bound())
                )
                if client_is_stored:
                    CONNECTED_CLIENTS[k].remove(websocket)
                if client_id in CONNECTED_CLIENTS.keys():
                    CONNECTED_CLIENTS[client_id].append(websocket)
                else:
                    CONNECTED_CLIENTS[client_id] = [websocket]
                if client_id == "777" or client_id == "admin":
                    # return student list
                    student_list_callback: dict = {}
                    try:
                        student_list_callback["students"] = (
                            json_assistant.StudentList.get_all_student_lists()
                        )
                        student_list_callback["classrooms"] = (
                            json_assistant.StudentList.get_all_classrooms()
                        )
                        await send_message(
                            student_list_callback, "STUDENT_LIST", websocket
                        )
                    except Exception as e:
                        error_message = f"{type(e).__name__}: {e}"
                        logging.error(error_message)
                        await send_message(
                            {"message": error_message}, "ERROR", websocket
                        )
                pprint(CONNECTED_CLIENTS)
                await update_connection_stats()
            elif msg_type == "WHO_AM_I":
                print(websocket.remote_address[0])
                is_found = False
                for class_no, v in CONNECTED_CLIENTS.items():
                    for client in v:
                        print(" ", client.remote_address[0])
                        if client.remote_address[0] == websocket.remote_address[0] and class_no != "777":
                            await send_message({"classNo": class_no}, "INIT", websocket)
                            is_found = True
                            break
                if not is_found:
                    await send_message(
                        {
                            "message": f"Class with IP {websocket.remote_address[0]} not found"
                        },
                        "ERROR",
                        websocket,
                    )
            elif msg_type == "BROADCAST":
                for key in CONNECTED_CLIENTS.keys():
                    if key == client_id:
                        continue
                    await send_message(data, "BROADCAST", CONNECTED_CLIENTS.get(key))
            elif msg_type == "CALL_FOR_STUDENT" or msg_type == "UNDO":
                msg_type: Literal["CALL_FOR_STUDENT", "UNDO"]
                target_id = data.get("targetClassNo", -1)
                target = CONNECTED_CLIENTS.get(target_id, []) + CONNECTED_CLIENTS.get(
                    "GENERAL", []
                )
                if len(target) == 0:
                    logging.error(f"Target {target_id} not found")
                    await send_message(
                        {"message": f"Target {target_id} not found"}, "ERROR", websocket
                    )
                else:
                    await send_message(data, msg_type, target)
            elif msg_type == "SEARCH":
                await send_message(
                    {"results": search(data["criteria"])}, "SEARCH_RESULT", websocket
                )
            elif msg_type == "EDIT":
                if data["password"] == b64encode(ADMIN_PASSWORD.encode("utf-8")).decode("utf-8"):
                    class_obj = json_assistant.StudentList(data["classNo"])
                    new_data = data["newStudentData"]
                    raw_data = {
                        "classroom": new_data["newClassroom"],
                        "students": new_data["newStudentData"],
                    }
                    class_obj.write_data(raw_data)
                else:
                    await send_message({"message": "Password incorrect"}, "ERROR", websocket)
            await send_message({"received": True}, "CALLBACK", websocket)
    except (ConnectionClosedError, ConnectionClosedOK) as e:
        logging.error(f"{type(e).__name__}: {e}")
        await remove_ws(websocket)


async def remove_ws(websocket: ServerConnection):
    global CONNECTED_CLIENTS
    client_is_stored, k = data_is_stored(websocket)
    if client_is_stored:
        CONNECTED_CLIENTS[k].remove(websocket)
        logging.info(f"{k} is removed.")
        logging.info(websocket.remote_address)
    pprint(CONNECTED_CLIENTS)
    await update_connection_stats()


def search(criteria: list[str]) -> list[dict]:
    search_results = []
    if criteria[0] in INDEX.keys():
        return [INDEX[criteria]]
    search_attempt = 0
    temp = []
    for word in criteria:
        if word == "":
            continue
        search_attempt += 1
        if search_attempt > 1:
            db = temp
        else:
            db = INDEX.keys()
        temp2 = []
        for k in db:
            if word in k:
                temp2.append(k)
        temp = temp2
    for i in temp:
        search_results.append(INDEX[i])
    return search_results


async def update_connection_stats():
    client_key_list = []
    for k, v in CONNECTED_CLIENTS.items():
        if v:
            client_key_list.append(k)
    for key in CONNECTED_CLIENTS.keys():
        await send_message(
            {"connected_clients": client_key_list},
            "CONNECTION_STATS",
            CONNECTED_CLIENTS.get(key),
        )


async def update_server_stats():
    while True:
        target = CONNECTED_CLIENTS.get("monitor", [])
        if target:
            logging.info("Gathering server stats")
            report = {"python_version": sys.version,
                      "os_version": platform.platform() + platform.release(),
                      "cpu_usage": psutil.cpu_percent(),
                      "memory_usage": {
                          "total": psutil.virtual_memory().total,
                          "used": psutil.virtual_memory().used,
                      },
                      "timestamp": time.time()}
            await send_message(report, "SERVER_STATS", target)
        else:
            logging.info("No monitor found, skipping")
        await asyncio.sleep(10)


async def main(ip_address: str, port: int, ssl_context: ssl.SSLContext = None, monitor: bool = False):
    global INDEX
    INDEX = json_assistant.StudentList.index_all_student_lists()
    # while True:
    #     pprint(search(input("輸入關鍵字 (以空格分隔)：").split(" ")))
    if monitor:
        async with serve(handler, ip_address, port, ping_timeout=None, ssl=ssl_context) as server:
            await asyncio.gather(update_server_stats(), server.serve_forever())
    else:
        async with serve(handler, ip_address, port, ping_timeout=None, ssl=ssl_context) as server:
            await asyncio.Future()


if __name__ == "__main__":
    import socket
    import configparser

    config = configparser.ConfigParser()
    config.read("config.ini")

    print("Your IP:", socket.gethostbyname(socket.gethostname()))
    if config.getboolean("ssl", "is-enabled", fallback=False):
        ssl_cert = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_cert.load_cert_chain(
            certfile=os.path.join(BASE_DIR, config.get("ssl", "certfile")),
            keyfile=os.path.join(BASE_DIR, config.get("ssl", "keyfile")),
        )
        asyncio.run(main(
            ip_address=config.get("server", "ip"),
            port=config.getint("server", "port", fallback=8001),
            ssl_context=ssl_cert,
            monitor=config.getboolean("server", "monitor-enabled", fallback=False),
        ))
    else:
        asyncio.run(main(
            ip_address=config.get("server", "ip"),
            port=config.getint("server", "port", fallback=8001),
            monitor=config.getboolean("server", "monitor-enabled", fallback=False),
        ))
