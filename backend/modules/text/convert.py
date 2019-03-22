
import subprocess


def convert_to_odt(filename):
    """ Run Libre Office to convert document to odt """
    subprocess.check_call(
        ('soffice', '--headless', '--convert-to', 'odt', filename))
