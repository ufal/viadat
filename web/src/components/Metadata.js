import React, { Component } from 'react';
import { FormGroup, ControlLabel, FormControl, Modal, Button } from 'react-bootstrap';
import update from 'react-addons-update';
import DatePicker from 'react-datepicker';
import moment from 'moment';

function status_to_name(name) {
    if (!name || name === "x") {
        return "Private";
    } if (name === "r") {
        return "Ready";
    } if (name === "p") {
        return "Public";
    }
    return "Unknown"
}

function StatusLabel(props) {
    return (<span>[{status_to_name(props.status)}]</span>);
}

class MetadataDialog extends Component {

    constructor(props) {
        super(props);
        this.state = {
            metadata: props.metadata,
            autodetecting: false,
            message: null,
        };

    }

    getValidationState() {
        if (this.state.metadata.title && this.state.metadata.title.length > 1) {
            return "success"
        } else {
            return "error"
        }
    }

    setNewStatus() {
        let status = "x";
        if (this.state.metadata.status !== "r") {
            status = "r"
        }
        this.setState(update(this.state, {metadata: {status: {$set: status}}}));
    }

    statusText() {
        if (this.state.metadata.status === "r") {
            return "Set as Private"
        } else if (!this.state.metadata.status || this.state.metadata.status === "x") {
            return "Set as Ready"
        }
    }

    get disabled() {
        return this.state.autodetecting || !(this.state.metadata.status === "r" || this.state.metadata.status === undefined || this.state.metadata.status === "x");
    }

    autodetect = () => {
        this.setState(() => ({autodetecting: true, message: "Autodetecting ..."}));
        this.props.onAutodetect().then(m => {
            if (m.error) {
                this.setState({...this.state, autodetecting: false, message: m.error});
            } else {
                this.setState({...this.state, metadata: m, autodetecting: false, message: "Done"});
            }
        }, e => {
            this.setState({...this.state, autodetecting: false, message: "Autodetection failed"});
        })
    }

    render() {
        let props = this.props;

        return (
        <Modal show={props.show} onHide={() => {props.onClose();}}>
        <Modal.Header closeButton>
            <Modal.Title>Metadata: {this.state.metadata.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>

        <FormGroup
          controlId="status"
        >
          <ControlLabel>Status</ControlLabel>
          <br/>
          <StatusLabel status={this.state.metadata.status}/><span> </span>
          { this.statusText() && <Button bsSize="small" onClick={() => this.setNewStatus()}>{this.statusText()}</Button> }
        </FormGroup>


        <FormGroup
          controlId="dc_title"
          validationState={this.getValidationState()}
        >
          <ControlLabel>Title</ControlLabel>
          <FormControl
            disabled={this.disabled}
            value={this.state.metadata["dc_title"] || ""}
            onChange={(e) => this.setState(update(this.state, {metadata: {"dc_title": {$set: e.target.value}}}))}
          >
          </FormControl>
        </FormGroup>

        <FormGroup
          controlId="viadat_narrator_name"
        >
          <ControlLabel>Narrator</ControlLabel>
          <FormControl
            disabled={this.disabled}
            value={this.state.metadata["viadat_narrator_name"] || ""}
            onChange={(e) => this.setState(update(this.state, {metadata: {"viadat_narrator_name": {$set: e.target.value}}}))}
          >
          </FormControl>
        </FormGroup>

        <FormGroup>
          <ControlLabel>Creation date</ControlLabel>
          <DatePicker selected={moment(this.state.metadata["dc_date_created"])}
                onChange={(e) => this.setState(update(this.state, {metadata: {"dc_date_created": {$set: (new Date(e)).toUTCString()}}}))}/>
        </FormGroup>

        <FormGroup>
        <ControlLabel>License</ControlLabel>
        <FormControl componentClass="select" placeholder="select"
            value={this.state.metadata.dc_rights_license}
            onChange={(e) => this.setState(update(this.state, {metadata: {"dc_rights_license": {$set: e.target.value}}}))}
        >
        <option value=""></option>
            <option value="Public domain (https://creativecommons.org/publicdomain/mark/1.0/)">Public domain (https://creativecommons.org/publicdomain/mark/1.0/)</option>
            <option value="Creative Commons - Attribution 4.0 International (CC BY 4.0) (https://creativecommons.org/licenses/by/4.0/)">Creative Commons - Attribution 4.0 International (CC BY 4.0) (https://creativecommons.org/licenses/by/4.0/)</option>
        </FormControl>
        </FormGroup>

        <Modal.Footer>
        {this.state.message}{" "}
        {this.props.onAutodetect && <Button disabled={this.disabled} onClick={this.autodetect}>Autodetect</Button>}
        <Button disabled={this.disabled} onClick={() => {this.props.onUpdate(this.state.metadata); this.props.onClose()}}>Update</Button>
        </Modal.Footer>
        </Modal.Body>
    </Modal>)
    }
}

export class Metadata extends Component {

    constructor(props) {
        super(props);
        this.state = {showEditDialog: false};
    }

    onEdit(e) {
        e.preventDefault();
        this.setState(update(this.state, {showEditDialog: {$set: true}}));
    }

    render() {
        return (
            <span>
            <MetadataDialog
                metadata={this.props.metadata}
                show={this.state.showEditDialog}
                onUpdate={this.props.onUpdate}
                onAutodetect={this.props.onAutodetect}
                onClose={() => this.setState(update(this.state, {showEditDialog: {$set: false}}))}/>
            <a role="button" onClick={(e) => this.onEdit(e)}>Metadata</a> <StatusLabel status={this.props.metadata.status}/>
            </span>
        );
    }
}

export default Metadata;