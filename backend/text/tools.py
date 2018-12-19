import os
import shutil
import tempfile

from . import convert
from . import extract


def load_transcript(filename):
    """ Create a transcript from .doc document """
    cwd = os.getcwd()
    filename = os.path.abspath(filename)
    tmp_dir = tempfile.mkdtemp()
    try:
        os.chdir(tmp_dir)
        input_data = os.path.join(tmp_dir, "input_data.doc")
        odt_data = os.path.join(tmp_dir, "input_data.odt")
        shutil.copyfile(filename, input_data)
        convert.convert_to_odt(input_data)
        return extract.extract_dialog_trascript(odt_data)
    finally:
        os.chdir(cwd)
        shutil.rmtree(tmp_dir)


def extract_info(filename):
    cwd = os.getcwd()
    filename = os.path.abspath(filename)
    tmp_dir = tempfile.mkdtemp()
    try:
        os.chdir(tmp_dir)
        input_data = os.path.join(tmp_dir, "input_data.doc")
        odt_data = os.path.join(tmp_dir, "input_data.odt")
        shutil.copyfile(filename, input_data)
        convert.convert_to_odt(input_data)
        return extract.extract_info(odt_data)
    finally:
        os.chdir(cwd)
        shutil.rmtree(tmp_dir)

