# coding=utf-8
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from json import loads, dumps
from time import sleep
import websockets
from websockets.sync.client import connect
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK

import logger

CLASS_NO: int = 0
CONNECTED: bool = False
LOGGER: logging.Logger = logger.create_logger()


def send_messages(websocket):
    logging.info("Process started: sending messages")
    while CONNECTED:
        websocket.send(dumps(
            {"type": "NORMAL" if input("廣播訊息？ (y/n)").lower() != "y" else "BROADCAST",
             "classNo": CLASS_NO,
             "message": input("輸入訊息："),
             }
        ))


def receive_messages(websocket):
    while CONNECTED:
        data = websocket.recv()
        print(f"來自Server的訊息: {data}")


def main(class_no: int):
    global CONNECTED, CLASS_NO
    with connect("ws://localhost:8001/", ping_interval=None, ping_timeout=None) as websocket:
        if not CONNECTED:
            websocket.send(dumps(
                {"type": "INIT",
                 "classNo": class_no,
                 }
            ))
            CLASS_NO = class_no
            CONNECTED = True
        with ThreadPoolExecutor(max_workers=2) as executor:
            executor.submit(send_messages, websocket)
            executor.submit(receive_messages, websocket)


if __name__ == "__main__":
    main(int(input("輸入班級編號：")))
