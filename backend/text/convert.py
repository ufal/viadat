
import subprocess


def convert_to_odt(filename):
    subprocess.check_call(
        ('soffice', '--headless', '--convert-to', 'odt', filename))
