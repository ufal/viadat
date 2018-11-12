import 'react-datepicker/dist/react-datepicker.css';

import moment from 'moment';
import React, { Component } from 'react';
import update from 'react-addons-update';
import { Button, ControlLabel, FormControl, FormGroup, Label, Modal, Table } from 'react-bootstrap';
import DatePicker from 'react-datepicker';

import { fetch_labelinstances_of_label, remove_label, update_label } from '../services/labels.js';
import LabelTree from './LabelTree';
import { LocationSelectDialog } from './MapView';

class LabelDialog extends Component {

    constructor(props) {
        super(props);
        this.state = {new_lemma: "",
                      label: props.label,
                      location_select_dialog: false,
                      items_and_counts: null,
                      reload_on_close: false}
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
        if (!label.lemmas) {
            label.lemmas = [this.state.new_lemma];
        } else {
            label.lemmas.push(this.state.new_lemma);
        }
        this.setState({...this.state, new_lemma: ""});
    }

    update = () => {
        let label = this.state.label;
        update_label(label,
                {lemmas: label.lemmas,
                 name: label.name,
                 location: label.location,
                 from_date: label.from_date,
                 to_date: label.to_date
                }).then(() => {
            this.close();
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
        let state = {...this.state};
        state.label.lemmas.splice(index, 1);
        this.setState(state);
    }

    onRemoveLabel() {
        remove_label(this.state.label).then(() => {
            this.props.closeDialog(true);
        });
    }

    onLocationClose = (update, location) => {
        let state = {...this.state, location_select_dialog: false};
        if (update) {
            state.label.location = location;
        }
        this.setState(state);
    }

    close = () => {
        this.props.closeDialog(true);
    }

    onFromDate = (date) => {
        let d = new Date(date);
        this.setState({...this.state, label: {...this.state.label, from_date: d.toUTCString()}});
    }

    onToDate = (date) => {
        let d = new Date(date);
        this.setState({...this.state, label: {...this.state.label, to_date: d.toUTCString()}});
    }

    render() {
        let props = this.props;
        return (
            <Modal show={props.label !== null} onHide={this.close}>
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

                    {
                    <div style={{paddingTop: "1em", paddingBottom: "1em"}}>
                        <LocationSelectDialog show={this.state.location_select_dialog}
                                              location={this.state.label.location}
                                              onClose={this.onLocationClose}/>
                        <Button onClick={() => this.setState({...this.state, location_select_dialog: true})}>Set location</Button>
                        {/*this.state.label.location &&
                         <MapView location={this.state.label.location}>
                            <MyMarker location={this.state.label.location}/>
                         </MapView>
                        */}
                    </div>}

                    <div style={{paddingTop: "1em", paddingBottom: "1em"}}>
                        From <DatePicker selected={this.state.label.from_date && moment(this.state.label.from_date)} onChange={this.onFromDate}/>
                        To <DatePicker selected={this.state.label.to_date && moment(this.state.label.to_date)} onChange={this.onToDate}/>
                    </div>

                    <div>
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
                    <Button type="submit" disabled={this.validationState !== "success"} onClick={(e) => this.onNewLemma(e)}>Add lemma</Button>
                    </form>
                    <p>
                    </p>

                </div>}
            </Modal.Body>
            <Modal.Footer>
                    <Button onClick={(e) => this.onRemoveLabel(e)}>Remove</Button>
                    <Button type="submit" onClick={this.update}>Save</Button>
            </Modal.Footer>
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
            <LabelTree showMap={true} ref={(r) => this.tree = r} onLabelSelect={(label) => this.labelSelect(label)}/>
            { this.state.label && <LabelDialog label={this.state.label} closeDialog={(reload) => this.closeDialog(reload)}/>}
            </div>)
    }

    labelSelect(label) {
        this.setState(update(this.state, {label: {$set: label}}));
    }

}

export default Labels;

