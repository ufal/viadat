import React, { Component } from "react";
import update from "react-addons-update";
import {
  Button,
  Checkbox,
  Glyphicon,
  Modal,
  Tab,
  Table,
  Tabs
} from "react-bootstrap";
import { AutoAffix } from "react-overlays";
import { soundManager } from "soundmanager2";

import { SERVER_URL } from "../../config.js";
import { fetch_document, fetch_labelinstance_map } from "./models/document.js";
import {
  create_labelinstance,
  delete_labelinstance,
  fetch_labels
} from "../../services/labels.js";
import LabelTree from "../gis/LabelTree.js";

function formatTime(seconds) {
  let secs = Math.floor(seconds % 60);
  if (secs < 10) {
    secs = "0" + secs;
  }
  return Math.floor(seconds / 60) + ":" + secs;
}

/// All this mess serves to capture overlapping regions
let Paragraph = props => {
  let parts = [];
  let i = 0;
  for (let s of props.segments) {
    parts.push({
      pos: +s.from,
      segment: i,
      push: true
    });
    parts.push({
      pos: +s.to,
      segment: i,
      push: false
    });
    i += 1;
  }
  parts.sort((a, b) => a.pos - b.pos);

  let stack = [];
  let offset = 0;
  let output = [];
  let text = props.p.text;

  let id_prefix = "segment-" + props.p.id + "-";
  for (let p of parts) {
    if (offset !== p.pos) {
      let clickId = null;
      let style = {};
      let tmp_stack = stack.slice();
      tmp_stack.sort(
        (a, b) => props.segments[a].zlevel - props.segments[b].zlevel
      );
      for (let s of tmp_stack) {
        let id = props.segments[s].clickId;
        if (id) {
          clickId = id;
          style["cursor"] = "pointer";
        }
        let background = props.segments[s].background;
        if (background) {
          style["backgroundColor"] = background;
        }
      }
      let t = text.slice(offset, p.pos);
      let id = id_prefix + offset;
      if (clickId !== null) {
        output.push(
          <span
            key={id}
            id={id}
            style={style}
            onClick={e => props.renderer.onClick(clickId)}
          >
            {t}
          </span>
        );
      } else {
        output.push(
          <span key={id} id={id} style={style}>
            {t}
          </span>
        );
      }
    }
    if (p.push) {
      stack.push(p.segment);
    } else {
      let index = stack.indexOf(p.segment);
      stack.splice(index, 1);
    }
    offset = p.pos;
  }

  if (offset !== text.length) {
    let t = text.slice(offset);
    let id = id_prefix + offset;
    output.push(
      <span key={id} id={id}>
        {t}
      </span>
    );
  }
  return output;
};

let Speech = props => {
  return (
    <div className="border" style={{ margin: "1em" }}>
      <p>
        <b>{props.speech.speaker}</b>
      </p>
      {props.speech.paragraphs.map(p => (
        <Paragraph
          key={p.id}
          p={p}
          renderer={props.renderer}
          segments={props.segments[p.id]}
        />
      ))}
    </div>
  );
};

let SelectedInfo = props => {
  return (
    <span style={{ margin: "1em" }}>
      {formatTime(props.info.begin)} - {formatTime(props.info.end)}
    </span>
  );
};

let AudioInfo = props => {
  return (
    <span style={{ margin: "1em" }}>
      Playing: {formatTime(props.info.position)} /{" "}
      {formatTime(props.info.length)}
    </span>
  );
};

let NewLabelDialog = props => {
  return (
    <Modal
      show={props.show}
      onHide={() => {
        props.renderer.closeDialog();
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title>Select label</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <LabelTree
          onLabelSelect={node => {
            let instance = {
              label: node._id,
              transcript: props.renderer.state.document.id,
              paragraph: props.textSelection.p,
              from: props.textSelection.from,
              to: props.textSelection.to
            };
            create_labelinstance(instance).then(r => {
              props.renderer.refreshLabels();
              props.renderer.closeDialog();
            });
          }}
        />
      </Modal.Body>
    </Modal>
  );
};

let EditLabelDialog = props => {
  return (
    <Modal
      show={props.show}
      onHide={() => {
        props.renderer.closeDialog();
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title>Edit label</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {props.labelInstance && <p>Label: {props.labelInstance.label.name}</p>}
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={() => {
            delete_labelinstance(props.labelInstance).then(() => {
              props.renderer.refreshLabels();
              props.renderer.closeDialog();
            });
          }}
        >
          Remove label
        </Button>
        <Button onClick={() => props.renderer.closeDialog()}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

let Header = props => {
  return (
    <Table striped bordered condensed hover>
      <tbody>
        {props.document.properties.map((p, i) => (
          <tr key={i}>
            <td>{p.name}</td>
            <td>{p.value}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

class TextRenderer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      document: null,

      tab: "audio",
      audioSelection: null,
      audioInfo: null,

      showDialog: null,
      textSelection: null,
      labelInstances: [],
      segments: null,
      labelHint: false,
      labelHintLemmas: []
    };
    this.sound = null;
  }

  recompState(state) {
    this.setState(
      update(state, { segments: { $set: this.computeSegments(state) } })
    );
  }

  componentDidMount() {
    fetch_document(this.props.transcript).then(document => {
      this.recompState(update(this.state, { document: { $set: document } }));
      //this.refreshLabels();
    });
    fetch_labels().then(data => {
      let lemmas = [];
      for (let l of data._items) {
        if (l.lemmas) {
          lemmas = lemmas.concat(l.lemmas);
        }
      }
      this.recompState(
        update(this.state, { labelHintLemmas: { $set: lemmas } })
      );
    });
  }

  closeDialog() {
    this.setState(update(this.state, { showDialog: { $set: null } }));
  }

  refreshLabels() {
    fetch_labelinstance_map(this.state.document.id).then(m => {
      this.recompState(
        update(this.state, { document: { label_instances: { $set: m } } })
      );
    });
  }

  onClick(key) {
    if (this.state.tab === "audio") {
      let audioSelection = null;
      if (key) {
        let sentence = this.state.document.sentences[key.p][key.sentence];
        let begin = sentence.audioBegin;
        let end = sentence.audioEnd;
        audioSelection = {
          p: key.p,
          sentence: key.sentence,
          begin: begin,
          end: end
        };
      }
      this.recompState(
        update(this.state, { audioSelection: { $set: audioSelection } })
      );
    }

    if (this.state.tab === "labels") {
      this.recompState(
        update(this.state, {
          labelInstanceSelection: { $set: key },
          showDialog: { $set: "edit-label" }
        })
      );
    }
    // this.setState(update(this.state, {selectedInfo: {$set: selectedInfo}}));
  }

  computeSegments(state) {
    let segments = {};
    if (state.document) {
      for (let key in state.document.sentences) {
        segments[key] = this.computeSegmentsForP(state, key);
      }
    }
    return segments;
  }

  computeSegmentsForP(state, key) {
    if (state.tab === "audio") {
      let make_sentence_id = () => {
        return { p: key, sentence: i++ };
      };
      let audioSelection = state.audioSelection;
      let i = 0;
      let output = state.document.sentences[key].map(s => ({
        from: s.from,
        to: s.to,
        background:
          audioSelection &&
          audioSelection.p === key &&
          audioSelection.sentence === i
            ? "#AADD00"
            : null,
        clickId: make_sentence_id(),
        zlevel: 0
      }));

      if (this.props.lemma) {
        for (let lemma of state.document.lemmas[key]) {
          if (this.props.lemma.includes(lemma.value)) {
            output.push({
              from: lemma.from,
              to: lemma.to,
              background: "#aaffaa",
              zlevel: -1
            });
          }
        }
      }
      return output;
    }
    if (state.tab === "labels") {
      let output = [];

      let label_instances = state.document.label_instances[key];
      if (label_instances) {
        for (let instance of label_instances) {
          output.push({
            from: instance.from,
            to: instance.to,
            background: "#77CCFF",
            clickId: instance,
            zlevel: 0
          });
        }
      }

      if (state.labelHint) {
        let labelHintLemmas = state.labelHintLemmas;
        for (let lemma of state.document.lemmas[key]) {
          if (labelHintLemmas.includes(lemma.value)) {
            output.push({
              from: lemma.from,
              to: lemma.to,
              background: "#ffbbcc",
              zlevel: -1
            });
          }
        }
      }
      return output;
    }
    return [];
  }

  play() {
    if (!this.state.audioSelection) {
      return;
    }
    //let sentence = this.state.document.sentences[this.state.audioInfo.key.p][this.state.selected.sentence];
    let begin = this.state.audioSelection.begin;
    let end = this.state.audioSelection.end;
    let url =
      SERVER_URL +
      "audio/" +
      this.props.transcript.audio.uuid +
      "/" +
      begin +
      "-" +
      end;

    if (this.sound) {
      this.sound.destruct();
      this.sound = null;
      this.setState(update(this.state, { audioInfo: { $set: null } }));
    }

    let length = end - begin;

    this.sound = soundManager.createSound({
      id: "mySound",
      url: url,
      autoLoad: true,
      autoPlay: true,
      whileplaying: () => {
        this.setState(
          update(this.state, {
            audioInfo: {
              $set: { position: this.sound.position / 1000, length: length }
            }
          })
        );
      }
    });

    //this.setState(update(this.state, {audioUrl: {$set: url}}));
  }

  stop() {
    if (this.sound) {
      this.sound.destruct();
      this.sound = null;
      this.setState(update(this.state, { audioInfo: { $set: null } }));
    }
  }

  onTabSelect(key) {
    this.recompState(
      update(this.state, { audioInfo: { $set: null }, tab: { $set: key } })
    );
  }

  onNewTag() {
    let selection = window.getSelection();
    let tokens = selection.anchorNode.parentElement.id.split("-");
    if (tokens.length !== 3 || tokens[0] !== "segment") {
      console.log("INVALID SELECTION");
      return;
    }
    let p = +tokens[1];
    let ptext = this.state.document.paragraphs[+tokens[1]];
    let offset = +tokens[2] + selection.anchorOffset;
    let text = selection.toString();
    let length = text.length;

    if (ptext.slice(offset, offset + length) === text) {
      // Normal selection
    } else if (ptext.slice(offset - length, offset) === text) {
      // Backward selection
      offset -= length;
    } else {
      alert("Invalid selection");
      return;
    }

    this.setState(
      update(this.state, {
        showDialog: { $set: "new-label" },
        textSelection: { $set: { p: p, from: offset, to: offset + length } }
      })
    );
  }

  toggleHint(value) {
    this.recompState(
      update(this.state, {
        labelHint: { $set: value }
      })
    );
  }

  render() {
    return (
      <div>
        <div className="affix-example">
          <AutoAffix viewportOffsetTop={15} container={this}>
            <div className="panel panel-default">
              <div className="panel-body">
                <Tabs onSelect={key => this.onTabSelect(key)}>
                  <Tab eventKey="audio" title="Audio">
                    <p>
                      <Button
                        disabled={!this.state.audioSelection}
                        onClick={() => this.play()}
                        bsSize="large"
                      >
                        <Glyphicon glyph="play" /> Play
                      </Button>

                      <Button
                        disabled={!this.state.audioInfo}
                        onClick={() => this.stop()}
                        bsSize="large"
                      >
                        <Glyphicon glyph="stop" /> Stop
                      </Button>
                      {this.state.selectedInfo && (
                        <SelectedInfo info={this.state.selectedInfo} />
                      )}
                      {this.state.audioInfo && (
                        <AudioInfo info={this.state.audioInfo} />
                      )}
                    </p>
                  </Tab>
                  <Tab eventKey="labels" title="Labels">
                    <Button onClick={() => this.onNewTag()}>New label</Button>
                    <Checkbox
                      inline
                      onClick={e => this.toggleHint(e.target.checked)}
                      style={{ marginLeft: "1em" }}
                    >
                      Show hint
                    </Checkbox>
                  </Tab>
                </Tabs>
              </div>
            </div>
          </AutoAffix>
        </div>
        {this.state.document && <Header document={this.state.document} />}
        {this.state.document &&
          this.state.segments &&
          this.state.document.speeches.map((s, index) => (
            <Speech
              renderer={this}
              key={index}
              speech={s}
              segments={this.state.segments}
            />
          ))}

        <NewLabelDialog
          renderer={this}
          show={this.state.showDialog === "new-label"}
          textSelection={this.state.textSelection}
        />
        <EditLabelDialog
          renderer={this}
          labelInstance={this.state.labelInstanceSelection}
          show={this.state.showDialog === "edit-label"}
        />
      </div>
    );
  }
}

export default TextRenderer;
