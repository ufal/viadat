import React, { Component } from 'react';
import { Table, Button, FormControl, FormGroup, ControlLabel, Modal, Label} from 'react-bootstrap';

import update from 'react-addons-update';

import LabelTree from './LabelTree';
import { update_label, fetch_label, fetch_labelinstances_of_label, remove_label } from '../services/labels.js';


class LabelDialog extends Component {

    constructor(props) {
        super(props);
        this.state = {new_lemma: "", label: props.label, items_and_counts: null, reload_on_close: false}
        fetch_labelinstances_of_label(props.label._id).then((data) => {
            let m = new Map();
            for (let instance of data._items) {
                let item = instance.transcript;
                let v = m.get(item._id);
                if (v) {
                    v.count += 1;
                } else {
                    m.set(item._id, {
                        item: item,
                        count: 1
                    })
                }
            }
            let items_and_counts = Array.from(m.values());
            this.setState({...this.state, "items_and_counts": items_and_counts});
        })

    }

    onNewLemma(e) {
        e.preventDefault();
        let label = this.state.label;
        let lemmas;
        if (!label.lemmas) {
            lemmas = [this.state.new_lemma];
        } else {
            lemmas = update(label.lemmas, {$push: [this.state.new_lemma]});
        }

        update_label(label, {lemmas: lemmas}).then(() => {
            fetch_label(this.props.label._id).then((data) => {
                this.setState(update(this.state,
                    {new_lemma: {$set: ""},
                     label: {$set: data},
                     reload_on_close: {$set: true},
                    }));
            })
        });
    }

    get validationState() {
        if (this.state.new_lemma.length > 0) {
            return "success"
        } else {
            return "error"
        }
    }

    onLemmaRemove(index) {
        let lemmas = this.state.label.lemmas.slice();
        lemmas.splice(index, 1);
        update_label(this.state.label, {lemmas: lemmas}).then(() => {
            fetch_label(this.props.label._id).then((data) => {
                this.setState(update(this.state, {reload_on_close: {$set: true}, label: {$set: data}}));
            })
        });
    }

    onRemoveLabel() {
        remove_label(this.props.label).then(() => {
            this.props.closeDialog(true);
        });
    }

    render() {
        let props = this.props;
        return (
            <Modal show={props.label !== null} onHide={() => {props.closeDialog(this.reload_on_close);}}>
            <Modal.Header closeButton>
                <Modal.Title>{props.label.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {this.state.label &&
                <div>
                    {this.state.items_and_counts &&
                    <Table bordered striped>
                        <thead>
                            <tr><th>Document</th><th>Occurences</th></tr>
                        </thead>
                        <tbody>
                            {this.state.items_and_counts.map((ic) => <tr key={ic.item._id}><td>{ic.item.name}</td><td>{ic.count}</td></tr>)}
                        </tbody>
                    </Table>
                    }
                    <div>
                    <p>
                    <Button bsStyle="primary" type="submit" onClick={(e) => this.onRemoveLabel(e)}>Remove label</Button>
                    </p>
                    {this.state.label.lemmas && this.state.label.lemmas.map((lemma, i) =>
                        <span key={i}><Label style={{cursor: "pointer"}} onClick={(e)=>this.onLemmaRemove(i)}>{lemma}</Label> </span>
                    )}
                    </div>
                    <form onSubmit={(e) => this.onSubmit(e)}>
                    <FormGroup validationState={this.validationState}>
                    <ControlLabel>New lemma</ControlLabel>
                    <FormControl
                        type="text"
                        value={this.state.new_lemma}
                        placeholder="Enter text"
                        onChange={(e) => this.setState(update(this.state, {new_lemma: {$set: e.target.value}}))}
                    />
                    <FormControl.Feedback />
                    </FormGroup>
                    <Button bsStyle="primary" type="submit" disabled={this.validationState !== "success"} onClick={(e) => this.onNewLemma(e)}>Add lemma</Button>                </form>
                </div>}
            </Modal.Body>
        </Modal>);
    }
}


class Labels extends Component {

    constructor(props) {
        super(props);
        this.state = {label: null};
    }

    closeDialog(reload) {
        this.setState(update(this.state, {label: {$set: null}}));
        if (reload) {
            this.tree.reload();
        }
    }

    render() {
        return(<div>
            <h1>Labels</h1>
            <LabelTree ref={(r) => this.tree = r} onLabelSelect={(label) => this.labelSelect(label)}/>
            { this.state.label && <LabelDialog label={this.state.label} closeDialog={(reload) => this.closeDialog(reload)}/>}
            </div>)
    }

    labelSelect(label) {
        this.setState(update(this.state, {label: {$set: label}}));
    }

}

export default Labels;

