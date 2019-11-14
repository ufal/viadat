import lxml.etree as et

from backend.utils.xml import element_to_text, elements_to_text
from backend.modules.text.nametag import canonize_tag
from backend.modules.text.service import safe_post


def validate_tokenizer(element):
    for sentence in element:
        if sentence.attrib or sentence.tag != "sentence":
            return sentence
        for token in sentence:
            if token.attrib or token.tag != "token":
                return token
    return None


def _morpohodita_lemmatize(text, output_format="json"):
    """Helper function to ensure we use the same calls every time (e.g. strip_lemma_comment)"""
    return safe_post(
        "http://lindat.mff.cuni.cz/services/morphodita/api/tag",
        {
            "data": text,
            "convert_tagset": "strip_lemma_comment",
            "output": output_format
         }
    ).json()


def get_lemmas(string):
    """ Connects Morphidata and returns lemmas in the input string """
    r = _morpohodita_lemmatize(string, "xml")
    # TODO can all the lemmas be lowercased? seems more natural that ivan/Ivan returns the same
    # thought this is decided by the lemmatizer
    xml = "<root>{}</root>".format(r["result"])
    root = et.fromstring(xml)
    return [t.get("lemma") for t in root.iter("token")]


def insert_lemmas(transcript):
    """ Insert lemmas into transcript """
    sections = transcript.find("sections")
    # TODO could be async?
    for p in transcript.find("body").iter("p"):
        text = p.text
        r = _morpohodita_lemmatize(text)
        offset = 0
        for sentence in r["result"]:
            for token in sentence:
                t = token["token"]
                offset = text.find(t, offset)
                end = offset + len(t)
                assert offset != -1

                lemma = token["lemma"]
                if len(lemma) > 1 or lemma.isalpha():
                    e = et.Element("lemma")
                    e.set("p", p.get("id"))
                    e.set("from", str(offset))
                    e.set("to", str(end))
                    e.set("value", lemma)
                    sections.append(e)
                offset = end


def element_offset(element):
    """ Get offset of element, counted from zero """
    parent = element.getparent()
    if parent is None:
        return 0
    offset = element_offset(parent)
    items = list(parent)
    i = items.index(element)
    return offset + len(elements_to_text(items[:i]))


def insert_name_tags(transcript):
    """ Insert tags from NameTag into transcript """
    sections = transcript.find("sections")
    for p in transcript.find("body").iter("p"):
        r = safe_post(
                 "http://lindat.mff.cuni.cz/services/nametag/api/recognize",
                 {"data": p.text,
                  "output": "xml"}).json()
        xml = "<response>{}</response>".format(r["result"])
        response = et.fromstring(xml)
        for e in response.iter("ne"):
            value = element_to_text(e)
            offset = element_offset(e)
            end = offset + len(value)

            for value in canonize_tag(value):
                element = et.Element("nametag")
                element.set("p", p.get("id"))
                element.set("from", str(offset))
                element.set("to", str(end))
                element.set("type", e.get("type"))
                element.set("value", value)
                sections.append(element)


def tokenize(transcript):
    """ Tokenize each paragraph in transcript """
    body = transcript.find("body")
    assert body is not None
    sections = transcript.find("sections")
    assert sections is not None

    for p in body.iter("p"):
        p_id = p.get("id")
        offset = 0
        r = safe_post(
            #  "http://lindat.mff.cuni.cz/services/morphodita/api/analyze",
            "http://lindat.mff.cuni.cz/services/morphodita/api/tokenize",
            {"data": p.text}).json()
        xml = "<response>{}</response>".format(r["result"])
        response = et.fromstring(xml)
        for s in response.iter("sentence"):
            start = offset
            if s.text:
                offset += len(s.text)
            for t in s.iter("token"):
                offset += len(t.text)
                if t.tail:
                    offset += len(t.tail)

            se = et.Element("sentence")
            se.set("p", p_id)
            se.set("from", str(start))
            se.set("to", str(offset))
            sections.append(se)
            if s.tail:
                offset += len(s.tail)
    return transcript


def analyze_transcript(transcript):
    """ Top-level method; it tokenizes and inserts lemma into transcript """
    tokenize(transcript)
    insert_lemmas(transcript)
    # insert_name_tags(transcript)
    #print("TRANSCRIPT: ", et.tostring(transcript, pretty_print=True).decode())
    return transcript
