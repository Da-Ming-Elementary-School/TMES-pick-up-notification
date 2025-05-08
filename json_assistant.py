# coding=utf-8
import time
from copy import deepcopy
from json import load, dump
from csv import reader, DictReader, DictWriter
import os
from os import path
import sys

BASE_DIR = os.path.dirname(sys.argv[0])


class StudentList:
    STUDENT_LIST_DIR = path.join(BASE_DIR, 'student_list')
    EMPTY_DATA = {"students": [], "classroom": ""}

    def __init__(self, class_no: str):
        self.class_no: str = class_no
        self.file_path: str = path.join(self.STUDENT_LIST_DIR, f'class_{class_no}.json')
        if not path.exists(self.file_path):
            raise FileNotFoundError(f'{self.file_path} not found')
        self.student_list: list = []
        self.classroom: str = ""
        self.load_data()

    def load_data(self):
        with open(self.file_path, mode="r", encoding="utf-8") as f:
            json_data = load(f)
            self.student_list = json_data.get("students", [])
            self.classroom = json_data.get("classroom", "")

    def write_data(self, data: dict):
        with open(self.file_path, mode="w", encoding="utf-8") as f:
            dump(data, f, indent=4, ensure_ascii=False)
        self.load_data()

    def get_student_list(self):
        return self.student_list

    def get_classroom(self):
        return self.classroom

    def sort_students(self):
        student_list = self.get_student_list()
        student_list.sort(key=lambda s: (s["classNo"], s["seatNo"]))
        self.write_data({
            "classroom": self.get_classroom(),
            "students": student_list,
        })

    @staticmethod
    def get_all_student_lists() -> dict[str, list[dict[str, int | str]]]:
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
    def get_all_classrooms() -> dict:
        all_classrooms = {}
        for file in os.listdir(StudentList.STUDENT_LIST_DIR):
            if not file.startswith('class_'):
                continue
            class_no = file.replace('class_', '').replace('.json', '')
            all_classrooms[class_no] = StudentList(class_no=class_no).get_classroom()
        return all_classrooms

    @staticmethod
    def index_all_student_lists():
        index_by_student = {}
        all_student_lists = StudentList.get_all_student_lists()
        for class_no, student_list in all_student_lists.items():
            for student in student_list:
                index_by_student[
                    "%d-%02d%s" % (student["classNo"], student["seatNo"], student["name"])
                ] = {"targetClassNo": class_no, "student": student}
        return index_by_student

    @staticmethod
    def import_from_csv(class_no: str):
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
                if i == 2:
                    student_list_data["classroom"] = row[3]
                student_list_data["students"].append(
                    {
                        "classNo": int(row[0]),
                        "seatNo": int(row[1]),
                        "name": row[2]
                    }
                )
                # print(row)
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
                    new_class_data.writeheader()
                    for row in old_class_data:
                        for student in school_data:
                            if row["姓名"] == student["姓名"]:
                                row["座號"] = student["座號"]
                                new_class_data.writerow(row)
                                break


if __name__ == '__main__':
    start_time = time.time()
    for f in os.listdir(StudentList.STUDENT_LIST_DIR):
        if not f.endswith(".json"):
            continue
        print(f)
        class_obj = StudentList(class_no=f[6:8])
        class_obj.sort_students()

    # pprint(StudentList.index_all_student_lists())
    print("Done. Time Taken:", time.time() - start_time)
