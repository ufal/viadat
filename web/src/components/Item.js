import queryString from "query-string";
import React, { Component } from "react";

import { fetch_transcript } from "../services/entries";
import TextRenderer from "./TextRenderer";

class Item extends Component {
  constructor(props) {
    super(props);
    this.state = { transcript: null };
  }

  componentDidMount() {
    let id = this.props.match.params.id;
    fetch_transcript(id).then(data => {
      this.setState({ ...this.state, transcript: data });
    });
  }

  render() {
    let search = this.props.location.search;
    let query = queryString.parse(search);

    return (
      <div>
        <h1>{this.state.transcript && this.state.transcript.name}</h1>
        {this.state.transcript && (
          <TextRenderer
            transcript={this.state.transcript}
            lemma={query.lemma}
          />
        )}
      </div>
    );
  }
}

export default Item;
