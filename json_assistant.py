# coding=utf-8
import json
import os
from os import path


class StudentList:
    STUDENT_LIST_DIR = path.join(path.dirname(__file__), 'student_list')

    def __init__(self, class_no: int):
        self.class_no: int = class_no
        self.file_path: str = path.join(self.STUDENT_LIST_DIR, f'class_{class_no}.json')
        if not path.exists(self.file_path):
            raise FileNotFoundError(f'{self.file_path} not found')
        self.student_list: list = []

        with open(self.file_path, mode="r", encoding="utf-8") as f:
            self.student_list = json.load(f).get("students", [])

    def write_data(self):
        with open(self.file_path, mode="w", encoding="utf-8") as f:
            json.dump(self.student_list, f, indent=4)

    def get_student_list(self):
        return self.student_list

    @staticmethod
    def get_all_student_lists():
        all_student_lists = {}
        for f in os.listdir(StudentList.STUDENT_LIST_DIR):
            if not f.startswith('class_'):
                continue
            class_no = f.replace('class_', '').replace('.json', '')
            all_student_lists[class_no] = StudentList(class_no=int(class_no)).get_student_list()
        return all_student_lists
