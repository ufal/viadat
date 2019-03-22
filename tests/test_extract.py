
from backend.modules.text.tools import load_transcript
from backend.modules.deposit.fa import force_alignment
from backend.modules.text.analyze import analyze_transcript


def get_speakers(transcript):
    return [e.get("speaker") for e in transcript.iter("speech")]


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
