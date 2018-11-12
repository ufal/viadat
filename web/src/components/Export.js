import React, { Component } from "react";
import update from "react-addons-update";
import { Button } from "react-bootstrap";

import {
  fetch_ready_groups,
  fetch_ready_sources,
  run_export
} from "../services/entries";

class Export extends Component {
  constructor(props) {
    super(props);
    this.state = { readySources: [], readyGroups: [] };

    this.refresh();
  }

  refresh() {
    fetch_ready_sources().then(s => {
      this.setState(update(this.state, { readySources: { $set: s._items } }));
    });
    fetch_ready_groups().then(s => {
      this.setState(update(this.state, { readyGroups: { $set: s._items } }));
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
        <h2>Ready sources</h2>
        <ul>
          {this.state.readySources.map(s => (
            <li key={s._id}>{s.metadata.dc_title}</li>
          ))}
          {this.state.readyGroups.map(s => (
            <li key={s._id}>{s.metadata.dc_title}</li>
          ))}
        </ul>
        <Button onClick={() => this.onExport()}>Run export</Button>{" "}
        {this.state.statusText}
      </div>
    );
  }
}

export default Export;
