import React, { Component } from "react";
import update from "react-addons-update";
import {
    Button,
    Collapse,
    ControlLabel,
    FormControl,
    FormGroup,
    Panel,
    Table
} from "react-bootstrap";
import { Link } from "react-router-dom";

import { create_narrator, fetch_narrators } from "../services/narrators";
import {fetch_all_sources} from "../services/entries";

const fields = ['dc_title', 'viadat_narrator_birthdate', 'dc_identifier',
    'dc_rights_uri', 'dc_rights', 'dc_rights_label'];

const field2display = {
 'dc_title': 'Name',
 'viadat_narrator_birthdate': 'Birthdate',
 'dc_identifier': 'Signature',
 'dc_rights_uri': 'License URI',
 'dc_rights': 'License Name',
 'dc_rights_label': 'License Label'
}

class NewNarratorForm extends Component {
    constructor(props) {
        super(props);
        this.initState = {
            metadata: props.metadata || {
                'dc_rights_uri': 'https://ufal.mff.cuni.cz/grants/viadat/license',
                'dc_rights': 'VIADAT License',
                'dc_rights_label': 'RES'
            },
            all_sources: [],
            all_narrators: [],
        };
        this.state = this.initState;
    }

    componentDidMount() {
        this.reset();
    }

    onSubmit(e) {
        e.preventDefault();
        if(this.getValidationState() === "success"){
            this.props.onSubmit(this.state.metadata);
            this.reset()
        }
    }

    reset() {
        this.setState(this.initState);
        fetch_all_sources().then(data => {
            this.setState(update(this.state, {all_sources: {$set: data._items}}));
        });
        fetch_narrators().then(data => {
            this.setState(update(this.state, {all_narrators: {$set: data._items}}));
        });
    }

    getValidationState() {
        const md  = this.state.metadata;
        for (const key of ["dc_title", "viadat_narrator_birthdate", "dc_identifier"]){
            if(this.validateField(key, md[key]) !== 'success'){
                return "error";
            }
        }
        return "success";
    }

    validateField(field, field_value){
        if(field === 'dc_identifier'){
            for (const entitiesWithMetadata of [this.state.all_sources, this.state.all_narrators]) {
                for (const {metadata: {dc_identifier: sig}} of entitiesWithMetadata) {
                    if (field_value === sig) {
                        return 'error';
                    }
                }
            }
        }
        if(field_value){
            return "success";
        }else {
            return "error";
        }
    }


    render() {
        return (
            <Panel>
                <form onSubmit={e => this.onSubmit(e)}>
                        {fields.map((field, index) => {
                            return (
                                <div key={field}>
                                <FormGroup validationState={this.validateField(field, this.state.metadata[field])}>
                                <ControlLabel>{field2display[field]}</ControlLabel>
                                <FormControl
                                    type="text"
                                    value={this.state.metadata[field] || ""}
                                    placeholder={field2display[field]}
                                    onChange={e =>
                                        this.setState(
                                            update(this.state, {
                                                metadata: { [field]: { $set: e.target.value } }
                                            })
                                        )
                                    }
                                    disabled={field.includes('_rights')}
                                />
                                <FormControl.Feedback />
                                </FormGroup>
                                </div>
                            )
                        })}
                    <Button
                        bsStyle="primary"
                        type="submit"
                        disabled={this.getValidationState() !== "success"}
                        onClick={e => this.onSubmit(e)}
                    >
                        Create Narrator
                    </Button>
                    <Button type="submit" onClick={this.props.onCancel}>
                        Cancel
                    </Button>
                </form>
            </Panel>
        );
    }
}

class Narrators extends Component {
    constructor(props) {
        super(props);
        this.state = { narrators: [], newNarratorForm: false };
    }

    refresh() {
        fetch_narrators().then(data => {
            this.setState(update(this.state, { narrators: { $set: data._items } }));
        });
    }

    componentDidMount() {
        this.refresh();
    }

    newNarrator(entry) {
        create_narrator(entry).then(r => {
            this.refresh();
        });
    }

    render() {
        return (
            <div>
                <Button
                    onClick={() =>
                        this.setState(update(this.state, { newNarratorForm: { $set: true } }))
                    }
                >
                    New narrator
                </Button>
                <Collapse in={this.state.newNarratorForm}>
                    <div>
                        <NewNarratorForm
                            onSubmit={narrator_metadata => {this.newNarrator({
                                "metadata": narrator_metadata
                            })
                            }}
                            onCancel={e => {
                                    e.preventDefault()
                                    this.setState(
                                        update(this.state, {newNarratorForm: {$set: false}})
                                    )
                                }
                            }
                        />
                    </div>
                </Collapse>

                <h1>Narrators</h1>

                <Table responsive>
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.narrators.map(n => {
                        return (
                            <tr key={n._id}>
                                <td>
                                    <Link to={"/narrator/" + n._id}> {n.metadata["dc_title"]}</Link>
                                </td>
                                <td>
                                    {
                                        n.metadata.status === 'r' ? 'Ready' :
                                        n.metadata.status === 'p' ? 'Published' :
                                        'Private'
                                    }
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </Table>
            </div>
        );
    }
}

export default Narrators;
