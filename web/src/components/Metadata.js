import moment from "moment";
import React, { Component } from "react";
import update from "react-addons-update";
import {
  Button,
  ControlLabel,
  FormControl,
  FormGroup,
  Modal
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import {fetch_published_narrators, fetch_narrators} from "../services/narrators";
import {fetch_all_sources} from "../services/entries"

function status_to_name(name) {
  if (!name || name === "x") {
    return "Private";
  }
  if (name === "r") {
    return "Ready";
  }
  if (name === "p") {
    return "Public";
  }
  return "Unknown";
}

function StatusLabel(props) {
  return <span>[{status_to_name(props.status)}]</span>;
}

class MetadataDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      metadata: {...props.metadata, ...{
      'dc_rights_uri': 'https://ufal.mff.cuni.cz/grants/viadat/license',
      'dc_rights': 'VIADAT License',
      'dc_rights_label': 'RES',
      'dc_language_iso': 'ces',
      'viadat_interview_date': new Date().toUTCString()
      }},
      narrators: [],
      all_sources: [],
      all_narrators: [],
      autodetecting: false,
      message: null
    };
  }

  componentDidMount() {
    this.reload();
  }

  reload(){
    fetch_published_narrators().then(n => {
      this.setState(update(this.state,{narrators: {$set: n._items}}))
    });
    fetch_all_sources().then(data => {
      this.setState(update(this.state, {all_sources: {$set: data._items}}));
    });
    fetch_narrators().then(data => {
      this.setState(update(this.state, {all_narrators: {$set: data._items}}));
    });
  }

  validate_field(field_value) {
    if (field_value) {
      return "success";
    } else {
      return "error";
    }
  }

  validateTitle(){
    return this.validate_field(this.state.metadata.dc_title)
  }
  validateNarrator() {
    return this.validate_field(this.state.metadata.dc_relation_ispartof)
  }
  validateLanguage(){
    if(this.state.metadata.dc_language_iso && this.state.metadata.dc_language_iso.length === 3){
      return "success"
    }else{
      return "error"
    }
  }
  validateRights(){
    for (const field of ['dc_rights', 'dc_rights_uri', 'dc_rights_label']){
      if(this.validate_field(field) !== 'success'){
        return 'error';
      }
    }
    return 'success';
  }
  validateInterviewDate(){
    return this.validate_field(this.state.metadata.viadat_interview_date)
  }
  validateIdentifier(){
    //TODO this entire check should rather be in the backend
    if(this.state.metadata.dc_identifier) {
      for (const entitiesWithMetadata of [this.state.all_sources, this.state.all_narrators]) {
        for (const {metadata: {dc_identifier: sig}} of entitiesWithMetadata) {
          if (this.state.metadata.dc_identifier === sig) {
            return 'error';
          }
        }
      }
      return 'success';
    }else{
      return 'error';
    }
  }

  validate(){
    for (const f of [this.validateTitle, this.validateNarrator, this.validateLanguage, this.validateRights, this.validateInterviewDate, this.validateIdentifier]){
      if(f.apply(this) !== 'success'){
        return 'error';
      }
    }
    return "success";
  }

  setNewStatus() {
    let status = "x";
    if (this.state.metadata.status !== "r") {
      status = "r";
    }
    this.setState(
      update(this.state, { metadata: { status: { $set: status } } })
    );
  }

  statusText() {
    if (this.state.metadata.status === "r") {
      return "Set as Private";
    } else if (
      !this.state.metadata.status ||
      this.state.metadata.status === "x"
    ) {
      return "Set as Ready";
    }
  }

  get disabled() {
    return (
      this.state.autodetecting ||
      !(
        this.state.metadata.status === "r" ||
        this.state.metadata.status === undefined ||
        this.state.metadata.status === "x"
      )
    );
  }

  autodetect = () => {
    this.setState(() => ({
      autodetecting: true,
      message: "Autodetecting ..."
    }));
    this.props.onAutodetect().then(
      m => {
        if (m.error) {
          this.setState({
            ...this.state,
            autodetecting: false,
            message: m.error
          });
        } else {
          this.setState({
            ...this.state,
            metadata: {...this.state.metadata,...m},
            autodetecting: false,
            message: "Done"
          });
        }
      },
      e => {
        this.setState({
          ...this.state,
          autodetecting: false,
          message: "Autodetection failed"
        });
      }
    );
  };

  _render_published_narrators(){
    const options = [];
    options.push(<option key="empty_option" value=""/>)
    for (const {metadata: {handle: h, dc_title: t, dc_identifier: sig}, _id: id} of this.state.narrators){
      options.push(<option key={id} value={h}>{t} ({sig})</option>)
    }
    return options;
  }

  render() {
    let props = this.props;

    return (
      <Modal
        show={props.show}
        onHide={() => {
          props.onClose();
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Metadata: {this.state.metadata.dc_title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormGroup controlId="status">
            <ControlLabel>Status</ControlLabel>
            <br />
            <StatusLabel status={this.state.metadata.status} />
            <span> </span>
            {this.statusText() && (
              <Button
                  disabled={this.disabled || this.validate()!== 'success'}
                  bsSize="small"
                  onClick={() => this.setNewStatus()}>
                {this.statusText()}
              </Button>
            )}
          </FormGroup>

          <FormGroup
            controlId="dc_title"
            validationState={this.validateTitle()}
          >
            <ControlLabel>Title</ControlLabel>
            <FormControl
              disabled={this.disabled}
              value={this.state.metadata["dc_title"] || ""}
              onChange={e =>
                this.setState(
                  update(this.state, {
                    metadata: { dc_title: { $set: e.target.value } }
                  })
                )
              }
            />
            <FormControl.Feedback />
          </FormGroup>

          <FormGroup
              controlId="dc_identifier"
              validationState={this.validateIdentifier()}
          >
            <ControlLabel>Signature</ControlLabel>
            <FormControl
                disabled={this.disabled}
                value={this.state.metadata["dc_identifier"] || ""}
                onChange={e =>
                    this.setState(
                        update(this.state, {
                          metadata: { dc_identifier: { $set: e.target.value } }
                        })
                    )
                }
            />
            <FormControl.Feedback />
          </FormGroup>

          <FormGroup controlId="viadat_interview_date" validationState={this.validateInterviewDate()}>
            <ControlLabel>Date of interview</ControlLabel>
            <DatePicker
              disabled={this.disabled}
              selected={moment(this.state.metadata["viadat_interview_date"])}
              onChange={e =>
                this.setState(
                  update(this.state, {
                    metadata: {
                      viadat_interview_date: { $set: new Date(e).toUTCString() }
                    }
                  })
                )
              }
            />
            <FormControl.Feedback />
          </FormGroup>

          <FormGroup controlId="viadat_narrator" validationState={this.validateNarrator()}>
            <ControlLabel>Narrator (Select one of the published narrators or create one)</ControlLabel>
            <FormControl
                disabled={this.disabled}
              componentClass="select"
              placeholder="select"
              value={this.state.metadata.dc_relation_ispartof}
              onChange={e =>
                  this.setState(update(this.state, {
                    metadata: { dc_relation_ispartof: { $set: e.target.value}}
                  }))
              }
            >
              {this._render_published_narrators()}
            </FormControl>
           <FormControl.Feedback/>
          </FormGroup>
          <a href="/narrators">Create New Narrator</a>

          <FormGroup controlId="dc_rights" validationState={this.validateRights()}>
            <ControlLabel>License</ControlLabel>
            <FormControl
                disabled={this.disabled}
              componentClass="select"
              placeholder="select"
              value={this.state.metadata.dc_rights_uri}
              onChange={e =>
              {
                const dc_rights = e.target.selectedOptions[0].text.split(" | ");
                const label = dc_rights[2]
                const rights = dc_rights[0];
                this.setState(
                      update(this.state, {
                        metadata: {
                          dc_rights_uri: {$set: e.target.value},
                          dc_rights_label: {$set: label},
                          dc_rights: {$set: rights}
                        }
                      })
                  )
              }
              }
            >
              <option value="" />
              <option value="https://ufal.mff.cuni.cz/grants/viadat/license">
                VIADAT License |
                (https://ufal.mff.cuni.cz/grants/viadat/license) |
                RES
              </option>
              <option value="https://creativecommons.org/publicdomain/mark/1.0/">
                Public domain |
                (https://creativecommons.org/publicdomain/mark/1.0/) |
                PUB
              </option>
              <option value="https://creativecommons.org/licenses/by/4.0/">
                Creative Commons - Attribution 4.0 International (CC BY 4.0) |
                (https://creativecommons.org/licenses/by/4.0/) |
                PUB
              </option>
            </FormControl>
            <FormControl.Feedback />
          </FormGroup>

          <FormGroup controlId="dc_language_iso" validationState={this.validateLanguage()}>
            <ControlLabel>Language (if set incorrectly, then force alignment will be incorrect)</ControlLabel>
            <FormControl
              componentClass="select"
              disabled="disabled"
              value={this.state.metadata.dc_language_iso}>
              <option value="ces">
                Czech
              </option>
            </FormControl>
            <FormControl.Feedback />
          </FormGroup>


          <Modal.Footer>
            {this.state.message}{" "}
            {this.props.onAutodetect && (
              <Button disabled={this.disabled} onClick={this.autodetect}>
                Autodetect
              </Button>
            )}
            <Button
              disabled={this.disabled || this.validate()!== 'success'}
              onClick={() => {
                this.props.onUpdate(this.state.metadata);
                this.props.onClose();
              }}
            >
              Update
            </Button>
          </Modal.Footer>
        </Modal.Body>
      </Modal>
    );
  }
}

export class Metadata extends Component {
  constructor(props) {
    super(props);
    this.state = { showEditDialog: false };
  }

  onEdit(e) {
    e.preventDefault();
    this.setState(update(this.state, { showEditDialog: { $set: true } }));
  }

  render() {
    return (
      <span>
        <MetadataDialog
          metadata={this.props.metadata}
          show={this.state.showEditDialog}
          onUpdate={this.props.onUpdate}
          onAutodetect={this.props.onAutodetect}
          onClose={() =>
            this.setState(
              update(this.state, { showEditDialog: { $set: false } })
            )
          }
        />
        <a role="button" onClick={e => this.onEdit(e)}>
          Metadata
        </a>{" "}
        <StatusLabel status={this.props.metadata.status} />
      </span>
    );
  }
}

export default Metadata;
