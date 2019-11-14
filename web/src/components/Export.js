import React, { Component } from "react";
import update from "react-addons-update";
import { Button } from "react-bootstrap";

import {
  fetch_ready_groups,
  fetch_ready_sources,
  run_export
} from "../services/entries";

import {
    fetch_ready_narrators
} from "../services/narrators"

class Export extends Component {
  constructor(props) {
    super(props);
    this.state = { readySources: [], readyGroups: [], readyNarrators: [] };

    this.refresh();
  }

  refresh() {
    fetch_ready_sources().then(s => {
      this.setState(update(this.state, { readySources: { $set: s._items } }));
    });
    fetch_ready_groups().then(s => {
      this.setState(update(this.state, { readyGroups: { $set: s._items } }));
    });
    fetch_ready_narrators().then(n => {
      this.setState(update(this.state, { readyNarrators: { $set: n._items } }));
    });
  }

  onExport() {
    this.setState(
      update(this.state, { statusText: { $set: "Exporting ..." } })
    );
    run_export().then(
      r => {
        this.refresh();
        if (r.status === 200) {
          this.setState(
            update(this.state, { statusText: { $set: "Exported" } })
          );
        } else {
          this.setState(
            update(this.state, {
              statusText: { $set: "Error: " + r.statusText }
            })
          );
        }
      },
      e => {
        this.setState(
          update(this.state, { statusText: { $set: "Error: " + e } })
        );
      }
    );
  }

  render() {
    return (
      <div>
        <h1>Export</h1>
          {this.state.readyNarrators.length > 0 && <h2>Ready Narrators</h2>}
          <ul>
              {this.state.readyNarrators.map(n => (
                  <li key={n._id}>{n.metadata.dc_title}</li>
              ))}
          </ul>

        {this.state.readySources.length > 0 && <h2>Ready sources</h2>}
        <ul>
          {this.state.readySources.map(s => (
            <li key={s._id}>{s.metadata.dc_title}</li>
          ))}
        </ul>

        {this.state.readyGroups.length > 0 && <h2>Ready groups</h2>}
        <ul>
          {this.state.readyGroups.map(s => (
            <li key={s._id}>{s.metadata.dc_title}</li>
          ))}
        </ul>
        { this.state.readySources.length === 0 &&
          this.state.readyGroups.length === 0 &&
          this.state.readyNarrators.length === 0 &&
          <p><i>Nothing to export</i></p>}

        <Button disabled={
            this.state.readySources.length === 0 &&
            this.state.readyGroups.length === 0 &&
            this.state.readyNarrators.length === 0
        }
                onClick={() => this.onExport()}>Run export</Button>{" "}
        {this.state.statusText}
      </div>
    );
  }
}

export default Export;
