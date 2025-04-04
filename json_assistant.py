# coding=utf-8
import time
from copy import deepcopy
from json import load, dump
from csv import reader, DictReader, DictWriter
import os
from os import path
import sys
from pprint import pprint
from itertools import tee

BASE_DIR = os.path.dirname(sys.argv[0])


class StudentList:
    STUDENT_LIST_DIR = path.join(BASE_DIR, 'student_list')
    EMPTY_DATA = {"students": []}

    def __init__(self, class_no: str):
        self.class_no: str = class_no
        self.file_path: str = path.join(self.STUDENT_LIST_DIR, f'class_{class_no}.json')
        if not path.exists(self.file_path):
            raise FileNotFoundError(f'{self.file_path} not found')
        self.student_list: list = []

        with open(self.file_path, mode="r", encoding="utf-8") as f:
            self.student_list = load(f).get("students", [])

    def write_data(self, data: dict):
        with open(self.file_path, mode="w", encoding="utf-8") as f:
            dump(data, f, indent=4, ensure_ascii=False)

    def get_student_list(self):
        return self.student_list

    @staticmethod
    def get_all_student_lists():
        all_student_lists = {}
        for file in os.listdir(StudentList.STUDENT_LIST_DIR):
            if not file.startswith('class_'):
                continue
            class_no = file.replace('class_', '').replace('.json', '')
            all_student_lists[class_no] = StudentList(class_no=class_no).get_student_list()
        with open("all_student_lists.json", "w", encoding="utf-8") as f:
            dump(all_student_lists, f, indent=4, ensure_ascii=False)
        return all_student_lists

    @staticmethod
    def index_all_student_lists():
        index_by_student = {}
        all_student_lists = StudentList.get_all_student_lists()
        for class_no, student_list in all_student_lists.items():
            for student in student_list:
                index_by_student[
                    "%d%02d%s" % (student["classNo"], student["seatNo"], student["name"])
                ] = {"targetClassNo": class_no, "student": student}
        return index_by_student

    @staticmethod
    def read_student_lists_from_csv(class_no: str):
        try:
            student_list_obj = StudentList(class_no=class_no)
        except FileNotFoundError:
            with open(path.join(StudentList.STUDENT_LIST_DIR, f"class_{class_no}.json"), mode="w",
                      encoding="utf-8") as f:
                dump(StudentList.EMPTY_DATA, f, indent=4)
            student_list_obj = StudentList(class_no=class_no)
        student_list_data = deepcopy(student_list_obj.EMPTY_DATA)
        with open(path.join(StudentList.STUDENT_LIST_DIR, f"{class_no}.csv"), mode="r", newline="",
                  encoding="utf-8-sig") as f:
            csv_reader = reader(f)
            i = 0
            for row in csv_reader:
                i += 1
                if i == 1:
                    continue
                student_list_data["students"].append(
                    {
                        "classNo": int(row[0]),
                        "seatNo": int(row[1]),
                        "name": row[2]
                    }
                )
                print(row)
        student_list_obj.write_data(student_list_data)

    @staticmethod
    def search_seat_no_from_name(class_no: str):
        with open(path.join(StudentList.STUDENT_LIST_DIR, f"全校班級名條.csv"), mode="r", newline="",
                  encoding="utf-8-sig") as f:
            school_data = list(DictReader(f))
            with open(path.join(StudentList.STUDENT_LIST_DIR, f"{class_no}.csv"), mode="r", newline="",
                      encoding="utf-8-sig") as f1:
                old_class_data = DictReader(f1)
                with open(path.join(StudentList.STUDENT_LIST_DIR, "new_data", f"{class_no}.csv"), mode="w", newline="",
                          encoding="utf-8-sig") as f2:
                    new_class_data = DictWriter(f2, fieldnames=old_class_data.fieldnames)
                    for row in old_class_data:
                        for student in school_data:
                            if row["姓名"] == student["姓名"]:
                                row["座號"] = student["座號"]
                                new_class_data.writerow(row)
                                break


if __name__ == '__main__':
    start_time = time.time()
    # for f in os.listdir(StudentList.STUDENT_LIST_DIR):
    #     if not f.endswith(".csv") or len(f) > 6:
    #         continue
    #     print(f)
    #     StudentList.read_student_lists_from_csv(class_no=f[:2])

    pprint(StudentList.index_all_student_lists())
    print("Done. Time Taken:", time.time() - start_time)
