
from backend.modules.text.tools import load_transcript
from backend.modules.deposit.fa import force_alignment
from backend.modules.text.analyze import analyze_transcript


def get_speakers(transcript):
    return [e.get("speaker") for e in transcript.iter("speech")]


def get_head_properties(transcript):
    return {p.get("name"): p.get("value") for p in transcript.iter("property")}


def test_extract_dialog_type1(test_files):
    t = load_transcript(test_files["doc1"])
    speakers = get_speakers(t)
    assert speakers == ['JH', 'JJ', 'JH']


def test_extract_and_align_type4(test_files):
    t = load_transcript(test_files["doc4"])
    speakers = get_speakers(t)
    assert speakers[0] == 'Hovorka'
    t = analyze_transcript(t)
    #print(extract_index(t))
    t = force_alignment(t, test_files["audio4"], "mp3")


def test_extract_header1(test_files, headers):
    doc = "doc1"
    t = load_transcript(test_files[doc])
    properties = get_head_properties(t)
    assert properties
    assert set(properties.keys()) == set(headers[doc].keys())
    assert set(properties.values()) == set(headers[doc].values())


def test_extract_header2(test_files, headers):
    doc = "doc2"
    t = load_transcript(test_files[doc])
    properties = get_head_properties(t)
    assert properties
    from pprint import pprint
    pprint(properties)
    assert set(properties.keys()) == set(headers[doc].keys())
    assert set(properties.values()) == set(headers[doc].values())


def test_extract_header3(test_files, headers):
    doc = "doc3"
    t = load_transcript(test_files[doc])
    properties = get_head_properties(t)
    assert properties
    assert set(properties.keys()) == set(headers[doc].keys())
    assert set(properties.values()) == set(headers[doc].values())
    from pprint import pprint
    pprint(properties)


def test_extract_header4(test_files, headers):
    doc = "doc4"
    t = load_transcript(test_files[doc])
    properties = get_head_properties(t)
    assert properties
    assert set(properties.keys()) == set(headers[doc].keys())
    assert set(properties.values()) == set(headers[doc].values())
    from pprint import pprint
    pprint(properties)

