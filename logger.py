# coding=utf-8
import logging
from colorlog import ColoredFormatter
import os
import sys
import datetime
import zoneinfo
from json import dumps
import websockets
from websockets.client import ClientConnection


base_dir = os.path.dirname(sys.argv[0])
now_tz = zoneinfo.ZoneInfo("Asia/Taipei")


def create_logger() -> logging.Logger:
    formatter = ColoredFormatter(
        fmt="%(white)s[%(asctime)s] %(log_color)s%(levelname)-8s%(reset)s %(blue)s%(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        reset=True,
        log_colors={
            "DEBUG": "cyan",
            "INFO": "green",
            "ANONYMOUS": "purple",
            "WARNING": "yellow",
            "BUGFLAG": "cyan",
            "ERROR": "red",
            "CRITICAL": "red",
        },
    )

    logger = logging.getLogger()
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    log_dir_path = os.path.join(base_dir, "logs")
    if not os.path.exists(log_dir_path):
        os.makedirs(log_dir_path)
    log_path = os.path.join(log_dir_path,
                            f"logs {datetime.datetime.now(tz=now_tz).strftime('%Y.%m.%d %H.%M.%S')}.log")
    with open(log_path, "w"):
        pass
    f_handler = logging.FileHandler(log_path, encoding="utf-8")
    f_handler.setFormatter(get_file_formatter())
    logger.addHandler(f_handler)
    logger.setLevel(logging.DEBUG)

    return logger


def get_file_formatter():
    return logging.Formatter(
        fmt="[%(asctime)s] %(levelname)-8s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")


class RemoteLogHandler(logging.Handler):
    def __init__(self, server_address: str):
        self.ws: websockets.ClientConnection | None = None
        try:
            self.ws = ClientConnection(server_address)
        except Exception as e:
            print("WS connection error", e)
        logging.Handler.__init__(self)

    def emit(self, record: logging.LogRecord):
        if self.ws:
            msg = self.format(record)
            data = dumps({
                "type": "LOG",
                "message": msg,
            })
            self.ws.send(data)
