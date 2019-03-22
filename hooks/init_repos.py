#!/usr/bin/python3

import yaml
import sys
import os

SCRIPT_DIR = sys.path[0]
LIST_NAME = "repo_list.yml"

with open(os.path.join(SCRIPT_DIR, LIST_NAME), 'r') as stream:
    try:
        repos = yaml.safe_load(stream)
        for path, github in repos.items():
            os.chdir(SCRIPT_DIR)
            os.chdir(path)

            os.system("git init")
            os.system("git remote remove origin")
            os.system(f"git remote add origin {github}")

    except yaml.YAMLError as exc:
        print (exc)
