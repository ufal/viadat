from eve import Eve
from .fs.filestore import store, filename, load, filesize
from .audio import cut
from flask_cors import CORS
from flask import jsonify, abort
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


import uuid
import mimetypes


import logging


def ref(resource, embeddable=False, required=False):
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
    return {
        'type': 'list',
        'schema': schema
    }


def ref_list(resource, embeddable=False):
    return list_type(ref(resource, embeddable=embeddable))


item_list = ref_list('entryitems', True)

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

metadata_type = {
    'type': 'dict',
    'schema': {
        'dc_title': required_string,
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

entryitems_schema = {
    'entry_id': {
         'type': 'objectid',
         'data_relation': {
             'resource': 'entries',
             'field': '_id',
             'embeddable': True
         },
         'required': 'true'
    },

    'name': simple_string,

    'kind': {
        'type': 'string',
        'readonly': 'true'
    },

    'origin': {
        'type': 'string',
        'readonly': 'true'
    },

    'references': {
        'type': 'list',
     },
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
        'entryitems': {
            "schema": entryitems_schema,
            'cache_control': 'no-cache, no-store, must-revalidate',
            'cache_expires': 0,
        },
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
        return users_db.find_one({"token": token}) is not None


FILES = "/home/spirali/projects/viadat/files"
app = Eve(settings=settings, static_folder=FILES, auth=TokenAuthenticator)
CORS(app)


def on_delete_label(item):
    instances = app.data.driver.db["labelinstances"]
    instances.remove({"label": item["_id"]})
    print("!!! DELETE", item)


app.on_delete_item_labels += on_delete_label


@app.route("/lemmatize")
def lemmatize():
    text = request.args["q"]
    lemmas = analyze.get_lemmas(text)
    return jsonify(lemmas)


@app.route('/download/<uid>')
@requires_auth("sources")
def download_item(uid):
    filename = os.path.join(FILES, uid)
    # TODO: Check that access rights
    if "begin" in request.args and "end" in request.args:
        begin = float(request.arg.get("begin"))
        end = float(request.arg.get("end"))
        return cut.cut(filename, begin, end)
    return app.send_static_file(uid)


@app.route('/download/<uid>/xml2json')
@requires_auth("sources")
def download_xml_as_json(uid):
    # TODO: Check that access rights
    with load(uid) as f:
        xml = et.parse(f)
    return json.dumps(to_json(xml.getroot()))


@app.route('/audio/<item_id>/<float:begin>-<float:end>')
@requires_auth("sources")
def get_audio(item_id, begin, end):
    size = end - begin
    return cut.cut(os.path.join(FILES, item_id), begin, size)


"""
@app.route('/run/<item_id>/align')
@requires_auth("sources")
def run_transcript(item_id):
    items = app.data.driver.db["entryitems"]
    transcript_item = items.find_one({"_id": ObjectId(item_id)})
    assert transcript_item  # TODO 404

    audio_id = None

    for item in transcript_item["references"]:
        if item["type"] == "audio":
            audio_id = item["item_id"]

    if not audio_id:
        return "No audio item found"

    audio_item = items.find_one({"_id": audio_id})

    audio_file = filename(str(audio_id))

    with load(item_id) as f:
        transcript = et.parse(f).getroot()

    transcript = force_alignment(
        transcript, audio_file, audio_item["file_type"])

    with store(item_id) as f:
        f.write(et.tostring(transcript))

    return str("Ok")
"""

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
    # TODO: This should be loaded from DB
    settings = {
        "url": "https://ufal-point-dev.ms.mff.cuni.cz/viadat-repo/",
        "user": "demo@ufal-point-dev.ms.mff.cuni.cz",
        "password": "***REMOVED***",
        "community": "export-test1",
        "collection": "testcol"
    }

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
                          {"$set": {"metadata.status": "p"}})

        logging.info("Exported %s", metadata["dc_title"])

    # Export sources

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
                "size": filesize(uid)
            }
            sources_db.update({"_id": source_id},
                              {"$push": {"files": fileitem}})

        return "{}"


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

    # TODO: Better assigning audio to docs
    docs.sort(key=lambda f: f["name"])
    audios.sort(key=lambda f: f["name"])

    transcripts = []
    for doc, audio in zip(docs, audios):
        transcript = load_transcript(filename(doc["uuid"]))
        transcript = analyze_transcript(transcript)
        transcript = force_alignment(
            transcript, filename(audio["uuid"]), "mp3")
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


def run():
    app.run(threaded=True)
