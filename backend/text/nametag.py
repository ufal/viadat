from .service import Service
import itertools

class Tag:

    def __init__(self, tag_string):
        self.tag_string = tag_string

    @property
    def pos(self):
        return self.tag_string[0]

    @property
    def case(self):
        return self.tag_string[4]

    @property
    def number(self):
        return self.tag_string[3]

    @property
    def gender(self):
        return self.tag_string[2]

    def __repr__(self):
        return "[{}]".format(self.tag_string)

    def __eq__(self, other):
        if isinstance(other, self.__class__):
            return self.tag_string == other.tag_string
        else:
            return False

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return hash(self.tag_string)


class TaggedWord:

    def __init__(self, word, lemma, tag):
        self.word = word
        self.lemma = lemma
        self.tag = tag

    def fix_uppercase(self, model):
        if model[0].isupper():
            self.word = self.word.capitalize()
        else:
            self.word = self.word.lower()

    def is_noun(self):
        return self.tag.pos == "N"

    def is_adjective(self):
        return self.tag.pos == "A"

    def __repr__(self):
        return "<{} ({}) {}>".format(self.word, self.lemma, repr(self.tag))

    def __eq__(self, other):
        if isinstance(other, self.__class__):
            return self.word == other.word and self.tag == other.tag and self.lemma == self.lemma
        else:
            return False

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return hash(self.word) ^ hash(self.tag) ^ hash(self.lemma)

def parse_tag_line(line):
    parts = line.split()
    return TaggedWord(parts[0], parts[1], Tag(parts[2]))

def parse_generate_line(line, lemma):
    parts = line.split()
    forms = [TaggedWord(parts[i], lemma, Tag(parts[i+2])) for i in range(0, len(parts), 3)]
    return forms

def generate(service, lemma):
    r = service.post(
        "http://lindat.mff.cuni.cz/services/morphodita/api/generate",
        {"data": lemma, "output": "vertical"}).json()
    return [parse_generate_line(line, lemma) for line in r["result"].split("\n") if line]


def synchronize_word(service, word, model):
    forms = generate(service, word.lemma)
    if not forms:
        return []
    forms = forms[0]

    return [w for w in forms
            if w.tag.case == "1"
                and w.tag.tag_string[:2] == word.tag.tag_string[:2]
                and w.tag.tag_string[5:-1] == word.tag.tag_string[5:-1]
                and w.tag.tag_string[-1] == "-"
                and w.tag.number == model.tag.number
                and w.tag.gender == model.tag.gender]


def basic_form_of_noun(service, word):
    generate_output = generate(service, word.lemma)
    if not generate_output:
        return None
    lemma_forms = generate_output[0]

    noun_forms = [f for f in lemma_forms
                  if f.tag.case == "1" and f.tag.number == "S"]
    if noun_forms:
        # NOTE: "-" < "0" < "1" ... so we choose more 'standard' form
        return min(noun_forms, key=lambda f: f.tag.tag_string[-1])
    else:
        noun_forms = [f for f in lemma_forms
                      if f.tag.case == "1" and f.tag.number == "N"]
        if noun_forms:
            return min(noun_forms, key=lambda f: f.tag.tag_string[-1])


def canonize_tag(string, debug_info=False):
    service = Service()
    r = service.post(
        "http://lindat.mff.cuni.cz/services/morphodita/api/tag",
        {"data": string, "output": "vertical"}).json()
    words = [parse_tag_line(line) for line in r["result"].split("\n") if line]

    # If verb or no nouns
    if all(not w.is_noun() for w in words):
        return (string,)
        #return " ".join(w for w in words)

    head_noun_idx, head_noun = next((i, w) for i, w in enumerate(words) if w.is_noun())

    # Check that all words before head noun are adjectives
    if not all(w.is_adjective() for w in words[:head_noun_idx]):
        return (string,)

    for i in range(head_noun_idx + 1, len(words)):
        w = words[i]
        if not w.is_noun() and not w.is_adjective():
            suffix_start_idx = i
            break
    else:
        suffix_start_idx = len(words)

    suffix = " ".join(w.word for w in words[suffix_start_idx:])
    results = []
    basic_form = basic_form_of_noun(service, head_noun)
    if basic_form:
        final_forms = []
        final_forms += [synchronize_word(service, w, basic_form) for w in words[:head_noun_idx]]
        final_forms.append((basic_form,))
        final_forms += [synchronize_word(service, w, basic_form) for w in words[head_noun_idx+1:suffix_start_idx]]
        for p in itertools.product(*final_forms):
            for w, original in zip(p, words):
                w.fix_uppercase(original.word)
            value = " ".join(w.word for w in p)
            if suffix:
                value += " " + suffix
            if debug_info:
                if suffix:
                    value += " ({} suffix: {})".format(" ".join(map(repr, p)), suffix)
                else:
                    value += " ({})".format(" ".join(map(repr, p)))
            results.append(value)
    if not results:
        return [string]
    else:
        return list(set(results))
