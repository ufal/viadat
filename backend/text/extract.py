"""
This module serves for extracting trascript from ODT document
"""

from lxml import etree as et
from ..utils.xml import element_to_text, elements_to_text, remove_and_preserve_tail
import zipfile
import re

ns_text = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'
ns_style = '{urn:oasis:names:tc:opendocument:xmlns:style:1.0}'
ns_fo = '{urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0}'


style_attr = ns_text + "style-name"

MAX_SPEAKER_NAME_LENGTH = 85


class TranscriptBuilder:

    def __init__(self):
        self.root = et.Element("transcript")
        self.head = et.Element("head")
        self.root.append(self.head)
        self.body = et.Element("body")
        self.root.append(self.body)
        self.root.append(et.Element("sections"))
        self.active_speech = None
        self.id_counter = 0

    def add_head_key_value(self, name, value):
        e = et.Element("property")
        e.set("name", name)
        e.set("value", value)
        self.head.append(e)

    def add_speech(self, speaker):
        e = et.Element("speech")
        e.set("speaker", speaker)
        self.body.append(e)
        self.active_speech = e

    def add_paragraph(self, text):
        text = text.strip()
        if not text:
            self.active_speech = None
        elif self.active_speech is not None:
            e = et.Element("p")
            e.set("id", str(self.id_counter))
            self.id_counter += 1
            e.text = text
            self.active_speech.append(e)


def extract_speakers(elements, builder):

    # Remove text in square brackets + white spaces before
    rx = re.compile("\s*\[[^\]]*\]")

    for e in elements:
        text = rx.sub("", element_to_text(e)).strip()
        if not text:
            continue
        i = text.find(":")
        if i == -1 or i > MAX_SPEAKER_NAME_LENGTH:
            builder.add_paragraph(text)
            continue
        builder.add_speech(text[:i].strip())
        builder.add_paragraph(text[i+1:].strip())


def extract_header(elements, builder):
    for e in elements:
        text = element_to_text(e).strip()
        i = text.find(":")
        if i == -1:
            continue
        name = text[:i].strip()
        value = text[i+1:].strip()
        builder.add_head_key_value(name, value)


def extract_dialog_trascript(filename):
    """
    This method takes a ODT document and returns parsed transcript
    """
    with open(filename, 'rb') as stream:
        stream = zipfile.ZipFile(stream)
        content = et.fromstring(stream.read("content.xml"))

    styles = content.iter(ns_style + "style")
    delimiter_styles = []
    for s in styles:
        for p in s.iter(ns_style + "paragraph-properties"):
            v = p.get(ns_fo + "border-bottom")
            if v and "solid" in v:
                delimiter_styles.append(s.get(ns_style + "name"))
        for p in s.iter(ns_style + "text-properties"):
            if p.get(ns_style + "text-underline-style") == "solid":
                delimiter_styles.append(s.get(ns_style + "name"))

    header = []
    body = []
    header_flag = True

    for p in content.iter(ns_text + "p"):
        if header_flag:
            header.append(p)
        else:
            body.append(p)
        if p.get(style_attr) in delimiter_styles:
            header_flag = False

    builder = TranscriptBuilder()
    extract_header(header, builder)
    extract_speakers(body, builder)
    return builder.root
