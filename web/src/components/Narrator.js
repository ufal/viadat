import React, { Component } from "react";
import { Button } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import cellEditFactory from 'react-bootstrap-table2-editor';
import update from "react-addons-update";
import { fetch_narrator, update_narrator } from "../services/narrators";

const columns = [
    {
        dataField: 'id',
        text: '#',
    },
    {
        dataField: 'key',
        text: 'Key',
        editable: false
    },
    {
        dataField: 'value',
        text: 'Value',
    }
];

export class Narrator extends Component {
    constructor(props){
        super(props);
        this.state = {
           narrator: {
               metadata: {
                   "dc_title": "dummy",
               }
           }
        }
        this.reload();
    }

    componentDidMount() {
        this.reload()
    }

    reload() {
        let id = this.props.match.params.id;
        fetch_narrator(id).then(narrator => {
            this.setState(update(
                this.state, { narrator: { $set: narrator } }
            ))
        })
    }

    render() {
        const data = Object.entries(this.state.narrator.metadata).filter(
            (([key, val], idx) => key !== 'status')
        ).map(([key, val], idx) => {
            return {
                id: idx,
                key: key,
                value: val,
            }
        });
        return(
            <div>
                <h2>{this.state.narrator.metadata.dc_title} [
                    {this.state.narrator.metadata.status === 'r' ? 'Ready' :
                     this.state.narrator.metadata.status === 'p' ? 'Published' :
                     'Private'
                    }]</h2>
            <BootstrapTable
            keyField='id'
            data={ data }
            columns={ columns }
            cellEdit={ cellEditFactory( {
                mode: 'click',
                afterSaveCell: (oldValue, newValue, row, column) => {
                    const updated = {
                        narrator: {
                            metadata: {
                                [row.key]: newValue
                            }
                        }
                    };
                    update_narrator(this.state.narrator, updated.narrator).then(() => {
                        this.reload()
                    });
                }
            })}
            />
                {this.state.narrator.metadata.status !== 'p' &&
                <Button
                    onClick={e => {
                        const newStatus = this.state.narrator.metadata.status === 'r' ? 'x' : 'r';
                        const updated = {
                            narrator: {
                                metadata: {
                                    status: newStatus
                                }
                            }
                        };
                        update_narrator(this.state.narrator, updated.narrator).then(() => {
                            this.reload()
                        });
                    }
                    }
                >
                    Set as {this.state.narrator.metadata.status === 'r' ? 'private' :
                    'ready'}
                </Button>
                }
            </div>
        )
    }
}

export default Narrator;