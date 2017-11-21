import React, { Component } from 'react';
import { FormGroup, ControlLabel, FormControl, Modal, Button } from 'react-bootstrap';
import update from 'react-addons-update';

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
            metadata: props.metadata
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
        } else if (!this.state.metadata.status) {
            return "Set as Ready"
        }
    }

    get disabled() {
        return !(this.state.metadata.status === "r" || this.state.metadata.status === undefined || this.state.metadata.status === "x");
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
          controlId="title"
          validationState={this.getValidationState()}
        >
          <ControlLabel>Title</ControlLabel>
          <FormControl
            disabled={this.disabled}
            value={this.state.metadata.title}
            onChange={(e) => this.setState(update(this.state, {metadata: {title: {$set: e.target.value}}}))}
          >
          </FormControl>
          </FormGroup>


        <FormGroup
          controlId="title"
        >
          <ControlLabel>Narrator</ControlLabel>
          <FormControl
            disabled={this.disabled}
            value={this.state.metadata.narrator || ""}
            onChange={(e) => this.setState(update(this.state, {metadata: {narrator: {$set: e.target.value}}}))}
          >
          </FormControl>
          </FormGroup>


        <Modal.Footer>
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
                onClose={() => this.setState(update(this.state, {showEditDialog: {$set: false}}))}/>
            <a role="button" onClick={(e) => this.onEdit(e)}>Metadata</a> <StatusLabel status={this.props.metadata.status}/>
            </span>
        );
    }
}

export default Metadata;