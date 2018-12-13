
import subprocess
import os.path
import json
import os

from ..utils.xml import elements_to_text
from ..fs.tmpdir import switch_to_tmpdir
from ..text.transcript import get_sentences

import lxml.etree as et


def force_alignment(transcript, audio_file, extension):
    """ Force align a transcript according an audio file.
        The transcript has to be processed by morphodita before
        calling this function, result is stored back into the
        transcript """
    def inner(tmp_dir):
        os.symlink(audio_file, "audio" + extension)
        input_file = os.path.join(tmp_dir, "input.txt")
        output_file = os.path.join(tmp_dir, "output.json")

        sentence_texts = get_sentences(transcript)
        sentences = transcript.find("sections").iter("sentence")

        text = "\n".join(sentence_texts)

        with open(input_file, "w") as f:
            f.write(text)
        subprocess.check_call((
            "python3",
            "-m", "aeneas.tools.execute_task",
            "audio" + extension, input_file,
            "task_language=ces|os_task_file_format=json|is_text_type=plain",
            output_file))

        with open(output_file) as f:
            output = json.load(f)

        for sentence, fragment in zip(sentences,
                                      output["fragments"]):
            sentence.set("audio-begin", fragment["begin"])
            sentence.set("audio-end", fragment["end"])
        return transcript
    audio_file = os.path.abspath(audio_file)
    return switch_to_tmpdir(inner)

# def force_alignment(transcript, audio_file):
#     input_file = os.path.join(tmp_dir, "input.txt")
#     output_file = os.path.join(tmp_dir, "output.json")

#     sentences = []
#     for text in transcript.texts:
#         sentences += text.sentences

#     with open(input_file, "w") as f:
#         f.write("\n".join(s.text for s in sentences))

#     subprocess.check_call(
#         "python3 -m aeneas.tools.execute_task "
#         "{audio_file} {input_file} "
#         "task_language=ces|os_task_file_format=json|is_text_type=plain "
#         "{output_file}".format(**locals()).split())

#     with open(output_file) as f:
#         output = json.load(f)

#     times = [(float(fragment["begin"]), float(fragment["end"]))
#              for fragment in output["fragments"]]

#     for sentence, time in zip(sentences, times):
#         sentence.begin = time[0]
#         sentence.end = time[1]
