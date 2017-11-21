import os
import tempfile
import shutil


def switch_to_tmpdir(fn):
    cwd = os.getcwd()
    tmp_dir = tempfile.mkdtemp()
    try:
        os.chdir(tmp_dir)
        return fn(tmp_dir)
    finally:
        os.chdir(cwd)
        shutil.rmtree(tmp_dir)