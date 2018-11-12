import { fetch_transcript_content } from "../services/entries";
import convert from "xml-js";
import { fetch_labelinstances } from "../services/labels";

function ensure_list(item) {
  if (item instanceof Array) {
    return item;
  } else {
    return [item];
  }
}

function load_document(data, item_id) {
  const document = {
    id: item_id,
    speeches: [],
    sentences: {},
    paragraphs: {},
    label_instances: [],
    properties: [],
    lemmas: {}
  };
  for (let p of ensure_list(data.transcript.head.property)) {
    document.properties.push(p._attributes);
  }

  for (let speech of ensure_list(data.transcript.body.speech)) {
    let s = {
      speaker: speech._attributes.speaker,
      paragraphs: ensure_list(speech.p).map(p => {
        document.sentences[p._attributes.id] = [];
        document.lemmas[p._attributes.id] = [];
        document.paragraphs[p._attributes.id] = p._text;
        return {
          id: p._attributes.id,
          text: p._text
        };
      })
    };
    document.speeches.push(s);
  }

  for (let s of ensure_list(data.transcript.sections.sentence)) {
    document.sentences[s._attributes.p].push({
      from: s._attributes.from,
      to: s._attributes.to,
      audioBegin: s._attributes["audio-begin"],
      audioEnd: s._attributes["audio-end"]
    });
  }

  for (let s of ensure_list(data.transcript.sections.lemma)) {
    document.lemmas[s._attributes.p].push({
      from: s._attributes.from,
      to: s._attributes.to,
      value: s._attributes.value
    });
  }
  return document;
}

export function fetch_labelinstance_map(id) {
  return fetch_labelinstances(id).then(data => {
    let result = {};
    for (let item of data._items) {
      let t = result[item.paragraph];
      if (!t) {
        t = [];
        result[item.paragraph] = t;
      }
      t.push(item);
    }
    return result;
  });
}

export function fetch_document(transcript) {
  let fetch_body = fetch_transcript_content(transcript).then(xml_data => {
    let data = convert.xml2js(xml_data, { compact: true });
    return load_document(data, transcript._id);
  });
  let fetch_linstances = fetch_labelinstance_map(transcript._id);
  return Promise.all([fetch_body, fetch_linstances]).then(r => {
    let document = r[0];
    document.label_instances = r[1];
    return document;
  });
}
/*
    let emph = {};
    let ls = this.props.location.state;
    if (ls && ls.emph) {
        for (let e of ensure_list(data.transcript.sections[ls.emph.element])) {
            if (!ls.emph.type || ls.emph.type.includes(e._attributes.type)) {

                if (!ls.emph.value || ls.emph.value.includes(e._attributes.value)) {
                    if (!emph[e._attributes.p]) {
                        emph[e._attributes.p] = []
                    }
                    emph[e._attributes.p].push({
                        from: +e._attributes.from,
                        to: +e._attributes.to,
                        background: "#00DDAA"
                    })
                }
            }
        }
    }
    */
