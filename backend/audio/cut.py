
from subprocess import check_call
import tempfile


def cut(filename, start, length):
    with tempfile.NamedTemporaryFile(mode="rb", suffix=".mp3") as f:
        check_call(("sox", "-t", "mp3", filename, f.name, "trim", str(start), str(length)))
        return f.read()
