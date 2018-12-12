"""
This is the main backend module that controls whole REST service
"""

from eve import Eve
from .fs.filestore import store, filename, load, filesize, compute_hash
from .audio import cut
from flask_cors import CORS
from flask import jsonify, abort, Response
import flask
import tempfile
import os
import json
from .utils.xml import to_json
from flask import request
from bson.objectid import ObjectId
from lxml import etree as et
from .audio.fa import force_alignment
from .text import analyze
from .repository import get_repository_collection
from . import users
from eve.auth import TokenAuth, requires_auth
from .text.tools import load_transcript
from .text.analyze import analyze_transcript
from flask import current_app


import io
import uuid
import mimetypes

import logging

REPOSITORY_SETTINGS = None


def ref(resource, embeddable=False, required=False):
    """ Create reference on resource """
    return {
        'type': 'objectid',
        'data_relation': {
            'resource': resource,
            'field': '_id',
            'embeddable': embeddable
        },
        'required': required
    }


def list_type(schema):
    """ Create list of given schema """
    return {
        'type': 'list',
        'schema': schema
    }


def ref_list(resource, embeddable=False):
    return list_type(ref(resource, embeddable=embeddable))


simple_string = {
    "type": "string"
}

simple_number = {
    "type": "number"
}

required_int = {
    "type": "integer",
    "required": True,
}

required_string = {
    "type": "string",
    "required": True,
}

entries_schema = {
    'name': required_string
}


# In metada, we are using "_" as separator instead of ".",
# E.g. "dc_title" instead of "dc.title".
# Dots are not supported in older versions of Eve
# "_" are replaced by "." during export

# When you add something here, you should update
# "repo_known_names" that controls what is acutally
# exported to repo

metadata_type = {
    'type': 'dict',
    'schema': {
        'handle': simple_string,
        'dc_title': required_string,
        'dc_date_created': {"type": "datetime", "nullable": True},
        'dc_rights_license': simple_string,
        'viadat_narrator_name': simple_string,
        'status': simple_string,
    }
}

sources_schema = {
    'entry': ref("entries", embeddable=True, required=True),
    'metadata': metadata_type,
    'files': {
        'type': 'list',
        'schema': {
            'type': 'dict',
            'schema': {
                'name': required_string,
                'size': required_int,
                'hash': required_string,
            }
        }
    }
}

doclink_type = {
    'type': 'dict',
    'schema': {
        'source': ref("sources"),
        'name': simple_string,
    }
}

groups_schema = {
    'entry': ref("entries", embeddable=True, required=True),
    'metadata': metadata_type,
}

transcripts_schema = {
    'group': ref("groups", embeddable=True, required=True),
    'name': simple_string,
    'uuid': simple_string,
    'audio': {
       'type': 'dict',
       'schema': {
            'source': ref("sources"),
            'uuid': simple_string,
        }
    }
}

labelcategory_schema = {
    'name': required_string,
    'parent': ref("labelcategories"),
    'color': simple_string,
    'bgcolor': simple_string,
}

labels_schema = {
    'name': required_string,
    'parent': ref("labelcategories", embeddable=True, required=True),
    'location': {"type": "point", "nullable": True},
    'from_date': {"type": "datetime", "nullable": True},
    'to_date': {"type": "datetime", "nullable": True},
    'lemmas': list_type(simple_string),
}

labelinstance_schema = {
    'label': ref('labels', required=True, embeddable=True),
    'transcript': ref('transcripts', required=True, embeddable=True),
    'paragraph': required_int,
    'from': required_int,
    'to': required_int,
}

lemmas_schema = {
    'value': simple_string,
    'transcripts': ref_list('transcripts', True),
}


def make_domain(schema):
    return {
            "schema": schema,
            'resource_methods': ['GET', 'POST'],
            'item_methods': ['GET', 'DELETE', 'PATCH'],
            'pagination': False,
            'cache_control': 'no-cache, no-store, must-revalidate',
            'cache_expires': 0,
    }


settings = {
    'MONGO_HOST': '127.0.0.1',
    'MONGO_PORT': 27017,
    'MONGO_DBNAME': 'viadat',
    'PAGINATION_LIMIT': 200,
    'X_DOMAINS': "*",
    'X_HEADERS': ['Authorization', 'Content-type', 'If-Match'],
    'DOMAIN': {
        'entries': make_domain(entries_schema),
        'lemmas': {
            "schema": lemmas_schema,
            'cache_control': 'no-cache, no-store, must-revalidate',
            'cache_expires': 0,
        },
        'sources': make_domain(sources_schema),
        'groups': make_domain(groups_schema),
        'transcripts': make_domain(transcripts_schema),
        'labelcategories': make_domain(labelcategory_schema),
        'labels': make_domain(labels_schema),
        'labelinstances': make_domain(labelinstance_schema)
    }
}


class TokenAuthenticator(TokenAuth):
    def check_auth(self, token, allowed_roles, resource, method):
        users_db = app.data.driver.db["users"]
        user = users_db.find_one({"token": token})
        if user is not None:
            self.set_request_auth_value(user["username"])
            return True
        else:
            return False


FILES = "/home/spirali/projects/viadat/files"
app = Eve(settings=settings, static_folder=FILES, auth=TokenAuthenticator)
CORS(app)


def category_subtree(category):
    category_db = app.data.driver.db["labelcategories"]
    subcats = category_db.find({"parent": category["_id"]})
    result = [category["_id"]]
    for c in subcats:
        result += category_subtree(c)
    return result


def on_delete_label(item):
    instances = app.data.driver.db["labelinstances"]
    instances.remove({"label": item["_id"]})


app.on_delete_item_labels += on_delete_label


def on_delete_labelcategories(item):
    categories = category_subtree(item)
    print("DELETING", categories)
    label_db = app.data.driver.db["labels"]
    labels = [label["_id"]
              for label in label_db.find({"parent": {"$in": categories}})]

    instances = app.data.driver.db["labelinstances"]
    instances.remove({"label": {"$in": labels}})
    label_db.remove({"_id": {"$in": labels}})

    category_db = app.data.driver.db["labelcategories"]
    category_db.remove({"_id": {"$in": categories}})


app.on_delete_item_labelcategories = on_delete_labelcategories


def on_delete_source(source):
    for f in source["files"]:
        logging.info("Removing file %s", f["uuid"])
        os.remove(filename(f["uuid"]))


app.on_delete_item_sources = on_delete_source


def on_delete_group(group):
    transcripts_db = app.data.driver.db["transcripts"]
    transcripts = list(transcripts_db.find({"group": group["_id"]}))

    tids = [t["_id"] for t in transcripts]

    lemmas_db = app.data.driver.db["lemmas"]
    lemmas_db.update_many({}, {"$pull": {"transcripts": {"$in": tids}}})

    labelinstances_db = app.data.driver.db["labelinstances"]
    labelinstances_db.remove(
        {"transcript": {"$in": tids}})

    for transcript in transcripts:
        os.remove(filename(transcript["uuid"]))


app.on_delete_item_groups = on_delete_group


def on_delete_entry(entry):
    sources_db = app.data.driver.db["sources"]
    sources = list(sources_db.find({"entry": entry["_id"]}))
    if sources:
        raise Exception("Entry is not empty")


app.on_delete_item_entries = on_delete_entry


@app.route("/lemmatize")
def lemmatize():
    text = request.args["q"]
    lemmas = analyze.get_lemmas(text)
    return jsonify(lemmas)


@app.route('/download/<uid>')
#@requires_auth("sources")
def download_item(uid):
    filename = os.path.join(FILES, uid)
    if "begin" in request.args and "end" in request.args:
        begin = float(request.arg.get("begin"))
        end = float(request.arg.get("end"))
        return cut.cut(filename, begin, end)
    return app.send_static_file(uid)


@app.route('/download/<uid>/<filename>')
#@requires_auth("sources")
def download_item2(uid, filename):
    return app.send_static_file(uid)


@app.route('/download/<uid>/xml2json')
@requires_auth("sources")
def download_xml_as_json(uid):
    with load(uid) as f:
        xml = et.parse(f)
    return json.dumps(to_json(xml.getroot()))


@app.route('/audio/<item_id>/<float:begin>-<float:end>')
#@requires_auth("sources")
def get_audio(item_id, begin, end):
    size = end - begin
    return cut.cut(os.path.join(FILES, item_id), begin, size)


@app.route('/transcript-download/<transcript_id>/<filename>')
def transcript_download(transcript_id, filename):
    data = generate_labelfile(transcript_id)
    return Response(data, mimetype="text/xml")


exts = {
    ".doc": "doc",
    ".docx": "doc",
    ".mp3": "audio",
    ".wmv": "audio",
    ".wav": "audio"
}


repo_known_names = ["dc_title",
                    "viadat_narrator_name"]


def metadata_to_repo_item(metadata):
    result = []
    for name in repo_known_names:
        value = metadata.get(name)
        if value:
            result.append(
                {"key": name.replace("_", "."),
                 "value": value,
                 "language": None})
    return result


def generate_labelfile(transcript_id):
    #  transcripts_db = app.data.driver.db["transcripts"]
    labelinstances_db = app.data.driver.db["labelinstances"]
    labels_db = app.data.driver.db["labels"]
    categories_db = app.data.driver.db["labelcategories"]

    instances = list(labelinstances_db.find(
        {"transcript": ObjectId(transcript_id)}))
    labels = {k: [] for k in set(instance["label"] for instance in instances)}

    for instance in instances:
        labels[instance["label"]].append(instance)

    root = et.Element("labels")
    for label_id, instances in labels.items():
        label = labels_db.find_one({"_id": label_id})
        e = et.Element("label")
        e.set("name", label["name"])
        root.append(e)

        parent = label["parent"]
        path = []
        while parent:
            category = categories_db.find_one({"_id": parent})
            path.append(category["name"])
            parent = category.get("parent")

        e.set("category", "/".join(path))

        for instance in instances:
            e2 = et.Element("instance")
            e2.set("p", str(instance["paragraph"]))
            e2.set("from", str(instance["from"]))
            e2.set("to", str(instance["to"]))
            e.append(e2)
    return et.tostring(root)


@app.route('/sources/<source_id>/autodetect')
@requires_auth("sources")
def source_autodetect(source_id):
    sources_db = app.data.driver.db["sources"]
    source = sources_db.find_one({"_id": ObjectId(source_id)})
    assert source  # TODO 404

    docs = [f for f in source["files"] if f["kind"] == "doc"]
    if not docs:
        return jsonify({"error": "No source document found"})

    doc = docs[0]

    transcript = load_transcript(filename(doc["uuid"]))
    properties = {p.get("name").lower(): p.get("value")
                  for p in transcript.iter("property")}

    def cleanup(value):
        if "(" in value:
            value = value[:value.index("(")]
        return value.strip()

    result = {
        "dc_title": properties.get("přepis rozhovoru"),
        "viadat_narrator_name": cleanup(properties.get("jméno a příjmení narátora/ky"))
    }

    return jsonify(result)


@app.route('/export', methods=['POST'])
@requires_auth("sources")
def export():
    settings = REPOSITORY_SETTINGS

    collection = get_repository_collection(settings)

    # Export sources

    sources_db = app.data.driver.db["sources"]
    ready_sources = sources_db.find({"metadata.status": "r"})
    mt = mimetypes.MimeTypes()

    for source in ready_sources:
        metadata = source["metadata"]
        logging.info("Exporting source %s", metadata["dc_title"])
        item = metadata_to_repo_item(metadata)
        remote_item = collection.create_item(item)

        for f in source["files"]:
            logging.info("Uploading %s", f["name"])
            mime = mt.guess_type(f["name"])[0]
            remote_item.add_bitstream(filename(f["uuid"]), mime, f["name"])
        sources_db.update({"_id": source["_id"]},
                          {"$set": {"metadata.status": "p",
                                    "metadata.handle": remote_item.handle}})

        logging.info("Exported %s", metadata["dc_title"])

    # Export transcipts

    groups_db = app.data.driver.db["groups"]
    transcripts_db = app.data.driver.db["transcripts"]
    ready_groups = groups_db.find({"metadata.status": "r"})

    for group in ready_groups:
        metadata = group["metadata"]
        logging.info("Exporting group %s", metadata["dc_title"])
        item = metadata_to_repo_item(metadata)
        remote_item = collection.create_item(item)
        for t in transcripts_db.find({"group": group["_id"]}):
            remote_item.add_bitstream(
                filename(t["uuid"]), "application/xml", t["name"] + ".xml")
            with tempfile.NamedTemporaryFile(mode="w+b") as f:
                f.write(generate_labelfile(t["_id"]))
                f.flush()
                remote_item.add_bitstream(
                    f.name, "application/xml", t["name"] + ".labels.xml")
        groups_db.update({"_id": group["_id"]},
                         {"$set": {"metadata.status": "p",
                                   "metadata.handle": remote_item.handle}})
        logging.info("Exported %s", metadata["dc_title"])
    return "Ok"


@app.route('/upload/<source_id>', methods=['GET', 'POST'])
@requires_auth("sources")
def upload_entry_item(source_id):
    sources_db = app.data.driver.db["sources"]
    source_id = ObjectId(source_id)
    source = sources_db.find_one({"_id": source_id})
    assert source  # TODO 404

    if request.method == 'POST':
        for f in request.files.getlist("file"):
            _, ext = os.path.splitext(f.filename)
            ext = ext.lower()
            uid = str(uuid.uuid4())

            with store(uid) as fout:
                f.save(fout)

            fileitem = {
                "name": f.filename,
                "kind": exts.get(ext),
                "file_type": ext,
                "uuid": uid,
                "size": filesize(uid),
                "hash": compute_hash(uid)
            }
            sources_db.update({"_id": source_id},
                              {"$push": {"files": fileitem}})

        return "{}"


def find_or_create(db, data):
    item = db.find_one(data)
    if item is None:
        item = db.insert_one(data).inserted_id
    else:
        return item["_id"]


def find_or_create_category(full_category_name):
    category_id = None
    categories_db = app.data.driver.db["labelcategories"]
    for name in full_category_name.split('/'):
        category_id = find_or_create(
            categories_db, {"name": name, "parent": category_id})
    return category_id


@app.route('/upload-at/<entry_id>', methods=['GET', 'POST'])
@requires_auth("sources")
def upload_at(entry_id):
    entry_db = app.data.driver.db["entries"]
    source_db = app.data.driver.db["sources"]
    group_db = app.data.driver.db["groups"]
    ts_db = app.data.driver.db["transcripts"]
    lemma_db = app.data.driver.db["lemmas"]
    labels_db = app.data.driver.db["labels"]
    labelinstances_db = app.data.driver.db["labelinstances"]

    entry_id = ObjectId(entry_id)
    entry = entry_db.find_one({"_id": entry_id})
    assert entry  # TODO 404

    metadata = {}
    metadata["dc_title"] = "Uploaded AT"

    g_item = {
        "entry": entry_id,
        "metadata": metadata,
    }
    group_id = group_db.insert_one(g_item).inserted_id

    if request.method == 'POST':
        files = request.files.getlist("file")
        for f in files:
            if not f.filename.endswith(".xml"):
                return jsonify("ERROR: Invalid file: {}".format(f.filename))

        at_files = [f for f in files if not f.filename.endswith(".labels.xml")]

        for upload_file in at_files:
            uid = str(uuid.uuid4())

            with store(uid) as fout:
                upload_file.save(fout)

            with load(uid) as f:
                xml = et.parse(f)

            transcript = xml.getroot()
            audio = transcript.find("head").find("audio")

            source = source_db.find_one({"files.hash": audio.get("hash")})
            for sf in source["files"]:
                if sf["hash"] == audio.get("hash"):
                    break

            t_item = {
                "name": upload_file.filename,
                "group": group_id,
                "uuid": uid,
                "audio": {
                    "source": source["_id"],
                    "uuid": sf["uuid"]
                }
            }
            transcript_id = ts_db.insert_one(t_item).inserted_id
            lemmas = set(lemma.get("value") for lemma in transcript.iter("lemma"))
            for lemma in lemmas:
                lemma_db.update({"value": lemma},
                                {"$push": {"transcripts": transcript_id}}, True)

            label_filename = upload_file.filename[:-4] + ".labels.xml"
            label_files = [fl for fl in files if fl.filename == label_filename]
            if not label_files:
                continue

            label_file = label_files[0]
            b = io.BytesIO()
            label_file.save(b)
            b.seek(0)
            label_root = et.parse(b).getroot()

            for label_data in label_root.findall("label"):
                logging.info("Importing label %s in %s",
                             label_data.get("name"), label_data.get("category"))
                category_id = find_or_create_category(label_data.get("category"))
                label_id = find_or_create(
                    labels_db, {"name": label_data.get("name"),
                                "parent": category_id})
                for instance_data in label_data.findall("instance"):
                    instance = {
                        "transcript": transcript_id,
                        "label": label_id,
                        "paragraph": instance_data.get("p"),
                        "from": instance_data.get("from"),
                        "to": instance_data.get("to"),
                    }
                    labelinstances_db.insert_one(instance)

    return jsonify("Ok")


@app.route('/create-at/<source_id>', methods=['GET', 'POST'])
@requires_auth("sources")
def create_at(source_id):
    sources_db = app.data.driver.db["sources"]
    source_id = ObjectId(source_id)
    source = sources_db.find_one({"_id": source_id})
    assert source  # TODO 404

    docs = [f for f in source["files"] if f["kind"] == "doc"]
    audios = [f for f in source["files"] if f["kind"] == "audio"]

    assert len(docs) == len(audios)

    docs.sort(key=lambda f: f["name"])
    audios.sort(key=lambda f: f["name"])

    transcripts = []
    for doc, audio in zip(docs, audios):
        transcript = load_transcript(filename(doc["uuid"]))
        transcript = analyze_transcript(transcript)
        transcript = force_alignment(
            transcript, filename(audio["uuid"]), "mp3")

        element = et.Element("audio")
        element.set("hash", audio["hash"])
        element.set("handle", source["metadata"]["handle"])
        transcript.find("head").append(element)
        transcripts.append(transcript)

    metadata = source["metadata"]
    metadata["dc_title"] = "Annotated " + metadata["dc_title"]
    if "status" in metadata:
        del metadata["status"]
    t_item = {
        "entry": source["entry"],
        "metadata": metadata,
    }

    group_db = app.data.driver.db["groups"]
    group_id = group_db.insert_one(t_item).inserted_id

    ts_db = app.data.driver.db["transcripts"]
    lemma_db = app.data.driver.db["lemmas"]
    for doc, audio, transcript in zip(docs, audios, transcripts):
        uid = str(uuid.uuid4())
        t_item = {
            "name": os.path.splitext(doc["name"])[0],
            "group": group_id,
            "uuid": uid,
            "audio": {
                "source": source["_id"],
                "uuid": audio["uuid"]
            }
        }
        transcript_id = ts_db.insert_one(t_item).inserted_id
        with store(uid) as f:
            f.write(et.tostring(transcript))

        lemmas = set(lemma.get("value") for lemma in transcript.iter("lemma"))
        for lemma in lemmas:
            lemma_db.update({"value": lemma},
                            {"$push": {"transcripts": transcript_id}}, True)

    return "Ok"


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', None)
    password = data.get('password', None)

    if username and password:
        token = users.login_user(app.data.driver.db, username, password)
        if not token:
            abort(403)
        return jsonify(token)
    else:
        abort(400)


@app.route('/logout', methods=['POST'])
@requires_auth("sources")
def logout():
    user = flask.g.get("auth_value", None)
    users.logout_user(app.data.driver.db, user)
    return jsonify("Ok")


def load_repository_config():
    with open("repository.conf") as f:
        return json.load(f)


def run():
    global REPOSITORY_SETTINGS
    REPOSITORY_SETTINGS = load_repository_config()
    app.run(threaded=True, host="0.0.0.0")
