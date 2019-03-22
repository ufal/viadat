#!/usr/bin/python3

import yaml
import sys
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("message", help="Commit message.")

args = parser.parse_args()

SCRIPT_DIR = sys.path[0]
LIST_NAME = "repo_list.yml"

with open(os.path.join(SCRIPT_DIR, LIST_NAME), 'r') as stream:
    try:
        repos = yaml.safe_load(stream)
        for path, github in repos.items():
            os.chdir(SCRIPT_DIR)
            os.chdir(path)

            os.system("git add .")
            os.system(f"git commit -m \"{args.message}\"")
            os.system("git push --force --set-upstream origin master")

    except yaml.YAMLError as exc:
        print (exc)
