import argparse
import os.path
import getpass

from . import users
from backend.modules.text.tools import load_transcript, extract_info
from backend.modules.text.analyze import analyze_transcript
from backend.modules.deposit.fa import force_alignment
from .fs.filestore import store, copy_to_store
from lxml import etree as et
from backend.modules.text.index import index_lemmas, index_nametags
from backend.settings import mongo_settings

from pymongo import MongoClient


def parse_args():
    parser = argparse.ArgumentParser(
        description='Command line tool for viadat')
    subparsers = parser.add_subparsers(help='Command', dest="command")

    p = subparsers.add_parser("service")

    p = subparsers.add_parser("create-user")
    p.add_argument('username', metavar='USERNAME')
    p.add_argument('--password', metavar='PASSWORD')

    p = subparsers.add_parser("remove-user")
    p.add_argument('username', metavar='USERNAME')

    p = subparsers.add_parser("reset-password")
    p.add_argument('username', metavar='USERNAME')
    p.add_argument('--password', metavar='PASSWORD')

    p = subparsers.add_parser("analyze")
    p.add_argument('doc', metavar='FILENAME')

    p = subparsers.add_parser("import-dir")
    p.add_argument('path', metavar='DIRPATH')
    return parser.parse_args()


def analyze(path):
    path = os.path.abspath(path)
    extract_info(path)


def import_entry(db, items, name):

    # TODO this reflects some sort of previous version; eg. entryitems db is only in this file
    transcripts = []
    for doc_path, audio_path in items:
        path = os.path.abspath(doc_path)
        print("Loading document ... ", path)
        transcript = load_transcript(path)
        print("Analyzing ...")
        transcript = analyze_transcript(transcript)
        transcripts.append(transcript)

    entry = db.entries.insert({"name": name})

    i = 0
    for (doc_path, audio_path), transcript in zip(items, transcripts):
        i += 1
        path = os.path.abspath(doc_path)

        doc = db.entryitems.insert({
            "name": os.path.basename(path),
            "origin": "upload",
            "kind": "doc",
            "file_type": ".doc",
            "entry_id": entry
        })

        copy_to_store(path, str(doc))

        if audio_path:
            audio_path = os.path.join(audio_path)
            _, ext = os.path.splitext(audio_path)
            ext = ext.lower()
            audio = db.entryitems.insert({
                "name": os.path.basename(audio_path),
                "origin": "upload",
                "kind": "audio",
                "file_type": ext,
                "entry_id": entry
            })
            copy_to_store(audio_path, str(audio))
            transcript = force_alignment(transcript, audio_path, ext)
        else:
            audio = None

        item = db.entryitems.insert({
            "name": "Annotated transcription {}".format(i),
            "origin": "gen",
            "kind": "at",
            "entry_id": entry,
            "references": [{"type": "audio", "item_id": audio},
                           {"type": "doc", "item_id": doc}]
        })

        print("New item:", str(item))

        with store(str(item)) as f:
            f.write(et.tostring(transcript))

        index_nametags(db, transcript, item)
        index_lemmas(db, transcript, item)


def filter_by_ext(names, extensions):
    for name in names:
        lname = name.lower()
        if any(lname.endswith(ext) for ext in extensions):
            yield name


def find_matching_file(name, extensions, filenames):
    base, ext = os.path.splitext(name)
    base = base.lower()
    for name in filenames:
        lname = name.lower()
        for ext in extensions:
            if base + ext == lname:
                return name


def connect_to_db():
    client = MongoClient(host=mongo_settings['MONGO_HOST'], port=mongo_settings['MONGO_PORT'])
    return client[mongo_settings['MONGO_DBNAME']]


def import_dir(path):
    path = os.path.abspath(path)

    doc_exts = (".doc", ".docx")
    audio_exts = (".mp3", ".wmv", ".wav")

    entry_paths = []
    for (dirpath, _, filenames) in os.walk(path):
        data = []
        for doc in sorted(filter_by_ext(filenames, doc_exts)):
            audio = find_matching_file(doc, audio_exts, filenames)
            if audio:
                data.append((os.path.join(dirpath, doc),
                             os.path.join(dirpath, audio)))
        if data:
            name = os.path.basename(
                os.path.commonprefix([d[0] for d in data]).strip())
            if not name:
                name = os.path.basename(dirpath)
            entry_paths.append((name, data))

    db = connect_to_db()
    for name, data in entry_paths:
        #  try:
            import_entry(db, data, name)
        #  except Exception as e:
        #      print("Importing {} failed".format(name))
        #      print(e)
    print(entry_paths)


def main():
    args = parse_args()

    if args.command == "create-user":
        db = connect_to_db()
        if args.password is not None:
            password = args.password
        else:
            password = getpass.getpass()
        users.create_new_user(db, args.username, password)
    elif args.command == "remove-user":
        db = connect_to_db()
        users.remove_user(db, args.username)
    elif args.command == "reset-password":
        db = connect_to_db()
        if args.password is not None:
            password = args.password
        else:
            password = getpass.getpass()
        users.reset_password(db, args.username, password)
    elif args.command == "analyze":
        analyze(args.doc)
    elif args.command == "import-dir":
        print("ERR: import-dir is outdated and not working")
        import sys
        sys.exit(1)
        import_dir(args.path)


if __name__ == "__main__":
    main()
