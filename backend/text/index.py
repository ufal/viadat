

def index_lemmas(db, transcript, item):
    lemmas = set(e.get("value") for e in transcript.find("sections").findall("lemma"))
    for value in lemmas:
        db.lemmas.update(
            {
                "value": value
            },
            {
                "$push": {"items" : item}
            },
            upsert=True
        )


def index_nametags(db, transcript, item):
    tags = set((e.get("type"), e.get("value")) for e in transcript.find("sections").findall("nametag"))
    for tag_type, tag_value in tags:
        db.nametags.update(
            {
                "type": tag_type,
                "value": tag_value
            },
            {
                "$push": {"items" : item}
            },
            upsert=True
        )
