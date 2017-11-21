import React, { Component } from 'react';
import { Table, Button, FormControl, FormGroup, ControlLabel, Collapse, Panel} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import update from 'react-addons-update';
import { fetch_entries, create_entry } from '../services/entries';

class NewEntryForm extends Component {

  constructor(props) {
      super(props);
      this.initState = {entry: {name: ""}};
      this.state = this.initState;
  }

  reset() {
      this.setState(this.initState);
  }

  get validState() {
      return this.state.entry.name ? "success" : "error";
  }

  onSubmit(e) {
      e.preventDefault();
      if (this.validState === "success") {
          this.props.onSubmit(this.state.entry);
          this.reset();
      }
  }

  render() {
  return (<Panel>
      <form onSubmit={(e) => this.onSubmit(e)}>
          <FormGroup
              validationState={this.validState}
          >
          <ControlLabel>Entry name</ControlLabel>
          <FormControl
              type="text"
              value={this.state.entry.name}
              placeholder="Enter text"
              onChange={(e) => this.setState(update(this.state, {entry: {name: {$set: e.target.value}}}))}
          />
          <FormControl.Feedback />
          </FormGroup>
      <Button bsStyle="primary" type="submit" disabled={this.validState !== "success"} onClick={(e) => this.onSubmit(e)}>Create entry</Button>
      <Button type="submit" onClick={this.props.onCancel}>Cancel</Button>
      </form>
      </Panel>
      )
  }

}


class Entries extends Component {

  constructor(props) {
    super(props);
    this.state = {entries: [], newEntryForm: false};
  }

  refresh() {
    fetch_entries().then(data => {
      this.setState(update(this.state, {entries: {$set: data._items}}));
    });
  }

  componentDidMount() {
    this.refresh();
  }

  newEntry(entry) {
    create_entry(entry).then((r) => {
      this.refresh();
    });
  }

  render() {
    return (
      <div>

        <Button onClick={() => this.setState(update(this.state, {newEntryForm: {$set: true}}))}>New entry</Button>
        <Collapse in={this.state.newEntryForm}>
          <div><NewEntryForm
              onSubmit={(entry) => this.newEntry(entry)}
              onCancel={() => this.setState(update(this.state, {newEntryForm: {$set: false}}))}/></div>
        </Collapse>

        <h1>Entries</h1>

        <Table responsive>
          <thead>
            <tr><th>Name</th></tr>
          </thead>
          <tbody>
            {this.state.entries.map(e => {
                return (<tr key={e._id}>
                        <td>
                        <Link to={"/entry/" + e._id}> {e.name}</Link>
                        </td>
                        </tr>);
            })}
          </tbody>
        </Table>
      </div>
    );
  }

}

export default Entries;
