def get_sections(transcript, name):
    paragraphs = {p.get("id"): p
                  for p in transcript.find("body").iter("p")}
    for s in transcript.find("sections").findall(name):
        yield paragraphs[s.get("p")].text[int(s.get("from")):int(s.get("to"))]


def get_sentences(transcript):
    return list(get_sections(transcript, "sentence"))


def get_tokens(transcript):
    return list(get_sections(transcript, "t"))
