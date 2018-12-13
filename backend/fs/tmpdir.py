import os
import tempfile
import shutil


def switch_to_tmpdir(fn):
    """ Switch CWD to a temporary directory, run function and
        then switch CWD back and remove dir """
    cwd = os.getcwd()
    tmp_dir = tempfile.mkdtemp()
    try:
        os.chdir(tmp_dir)
        return fn(tmp_dir)
    finally:
        os.chdir(cwd)
        shutil.rmtree(tmp_dir)