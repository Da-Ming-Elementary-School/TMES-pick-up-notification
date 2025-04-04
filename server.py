# coding=utf-8
import asyncio
from json import loads, dumps
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


def data_is_stored(data) -> tuple[bool, str | None]:
    for k, v in CONNECTED_CLIENTS.items():
        if data in v:
            return True, k
    return False, None


async def send_message(data: dict,
                       message_type: Literal[
                           "INIT", "ERROR", "CALLBACK", "BROADCAST", "STUDENT_LIST", "CALL_FOR_STUDENT", "UNDO",
                           "SEARCH_RESULT"],
                       targets: ServerConnection | list[ServerConnection]):
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
                closed.add_done_callback(lambda _: remove_ws(websocket))
                if client_is_stored:
                    CONNECTED_CLIENTS[k].remove(websocket)
                if client_id in CONNECTED_CLIENTS.keys():
                    CONNECTED_CLIENTS[client_id].append(websocket)
                else:
                    CONNECTED_CLIENTS[client_id] = [websocket]
                if client_id == "777":
                    # return student list
                    student_list_callback: dict = {}
                    try:
                        student_list = json_assistant.StudentList.get_all_student_lists()
                        student_list_callback["students"] = student_list
                        await send_message(student_list_callback, "STUDENT_LIST", websocket)
                    except Exception as e:
                        error_message = f"{type(e).__name__}: {e}"
                        logging.error(error_message)
                        await send_message({"message": error_message}, "ERROR", websocket)
                pprint(CONNECTED_CLIENTS)
            elif msg_type == "BROADCAST":
                for key in CONNECTED_CLIENTS.keys():
                    if key == client_id:
                        continue
                    await send_message(data, "BROADCAST", CONNECTED_CLIENTS.get(key))
            elif msg_type == "CALL_FOR_STUDENT" or msg_type == "UNDO":
                msg_type: Literal["CALL_FOR_STUDENT", "UNDO"]
                target_id = data.get("targetClassNo", -1)
                target = CONNECTED_CLIENTS.get(target_id, [])
                if len(target) == 0:
                    logging.error(f"Target {target_id} not found")
                    await send_message({"message": f"Target {target_id} not found"}, "ERROR", websocket)
                else:
                    await send_message(data, msg_type, target)
            elif msg_type == "SEARCH":
                await send_message({"results": search(data["criteria"])}, "SEARCH_RESULT", websocket)
            await send_message({"received": True}, "CALLBACK", websocket)
    except (ConnectionClosedError, ConnectionClosedOK) as e:
        logging.error(f"{type(e).__name__}: {e}")
        remove_ws(websocket)


def remove_ws(websocket: ServerConnection):
    global CONNECTED_CLIENTS
    client_is_stored, k = data_is_stored(websocket)
    if client_is_stored:
        CONNECTED_CLIENTS[k].remove(websocket)
        logging.info(f"{k} is removed.")
        logging.info(websocket.local_address)
    pprint(CONNECTED_CLIENTS)


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


async def main():
    global INDEX
    INDEX = json_assistant.StudentList.index_all_student_lists()
    # while True:
    #     pprint(search(input("輸入關鍵字 (以空格分隔)：").split(" ")))
    async with serve(handler, "", 8001, ping_timeout=None) as server:
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
