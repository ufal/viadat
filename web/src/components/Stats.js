import "c3/c3.css";

import React, { Component } from "react";
import C3Chart from "react-c3js";

import { fetch_document } from "./annotate/models/document.js";
import { fetch_transcript } from "../services/entries";

class Item extends Component {
  constructor(props) {
    super(props);
    this.state = { transcript: null, data: null };
  }

  componentDidMount() {
    let id = this.props.match.params.id;
    fetch_transcript(id).then(data => {
      this.setState({ ...this.state, transcript: data });
      fetch_document(data).then(document => {
        console.log(document);
        let map = new Map();
        for (let p in document.lemmas) {
          for (let lemma of document.lemmas[p]) {
            let v = map.get(lemma.value);
            if (v) {
              map.set(lemma.value, v + 1);
            } else {
              map.set(lemma.value, 1);
            }
          }
        }
        let items = [...map.entries()].sort((a, b) => b[1] - a[1]);
        let counts = ["counts"];
        let names = ["x"];
        let limit = 50;
        let i = 0;
        for (let item of items) {
          counts.push(item[1]);
          names.push(item[0]);
          i += 1;
          if (i > limit) {
            break;
          }
        }
        console.log(names);
        this.setState({
          ...this.state,
          data: {
            x: "x",
            columns: [names, counts],
            labels: true,
            type: "bar"
          }
        });
      });
    });
  }

  render() {
    return (
      <div>
        <h1>
          Statistics of {this.state.transcript && this.state.transcript.name}
        </h1>
        {this.state.data && (
          <div>
            <h2>Lemma counts</h2>
            <C3Chart
              data={this.state.data}
              axis={{
                x: {
                  type: "category",
                  tick: {
                    rotate: 75,
                    multiline: false
                  }
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }
}

export default Item;
