
import os.path
import shutil
import hashlib

VIADAT_ROOT = os.path.dirname(os.path.abspath(__name__))
VIADAT_FILESTORAGE = os.path.join(VIADAT_ROOT, "files")


def filename(name):
    return os.path.join(VIADAT_FILESTORAGE, name)


def store(name, mode="wb"):
    return open(filename(name), "wb")


def load(name, mode="rb"):
    return open(filename(name), "rb")


def filesize(name):
    return os.stat(filename(name)).st_size


def copy_to_store(source_filename, name):
    shutil.copy(source_filename, filename(name))


def compute_hash(name):
    BLOCKSIZE = 65536  # 64KiB
    h = hashlib.sha1()
    with load(name) as f:
        buf = f.read(BLOCKSIZE)
        while len(buf) > 0:
            h.update(buf)
            buf = f.read(BLOCKSIZE)
    return h.hexdigest()
