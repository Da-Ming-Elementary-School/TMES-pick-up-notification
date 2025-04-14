# coding=utf-8
import asyncio
import ssl
import os
import sys
import logging
from concurrent.futures import ThreadPoolExecutor
from json import loads, dumps
from time import sleep
import websockets
from websockets.sync.client import connect
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK

import logger

CLASS_NO: str = ""
CONNECTED: bool = False
LOGGER: logging.Logger = logger.create_logger()
BASE_DIR = os.path.dirname(sys.argv[0])
SSL_CONTEXT = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
SSL_CONTEXT.load_cert_chain(
    certfile=os.path.join(BASE_DIR, "cert", "cert.pem"),
    keyfile=os.path.join(BASE_DIR, "cert", "key.pem")
)


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


def main(class_no: str):
    global CONNECTED, CLASS_NO
    with connect("wss://192.168.112.104:8001/", ping_interval=None, ping_timeout=None, ssl=SSL_CONTEXT) as websocket:
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
    main(input("輸入班級編號："))
