import React, { Component } from 'react';
import { ListGroup, ListGroupItem, Table, Glyphicon, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Upload } from './Upload';
import { Metadata } from './Metadata'

import {update_source, autodetect_source_metadata, update_group, fetch_entry, fetch_groups, upload_source_files, create_source, fetch_sources, fetch_transcripts, create_transcription} from '../services/entries';
import update from 'react-addons-update';


class SourceItem extends Component {
    constructor(props) {
        super(props);
        this.state = { showUploadDialog: false }
    }

    uploadFiles(files) {
        return upload_source_files(this.props.source._id, files).then(() => {
            this.setState(update(this.state, {showUploadDialog: {$set: false}}));
            this.props.entry.reload();
        })
    }

    updateMetadata = metadata => {
        update_source(this.props.source, {metadata: metadata}).then(() => {
            this.props.entry.reload();
        })
    }

    autodetectMetadata = _ => {
        return autodetect_source_metadata(this.props.source._id);
    }

    get canUpload() {
        let s = this.props.source.metadata.status;
        return (s === undefined || s === "x" || s === "r");
    }

    createAt() {
        this.setState(update(this.state, {message: {$set: "Creating ..."}}))
        create_transcription(this.props.source._id).then((e) => {
            if (e.status === 200) {
                this.setState(update(this.state, {message: {$set: "Created"}}));
                this.props.entry.reload();
            } else {
                this.setState(update(this.state, {message: {$set: "Failed: " + e.statusText}}))
            }
        })
    }

    render() {
        return (<div>
            <h3>{this.props.source.metadata.title}</h3>

            <Metadata metadata={this.props.source.metadata}
                      onUpdate={this.updateMetadata}
                      onAutodetect={this.autodetectMetadata}/>

            <Upload
                show={this.state.showUploadDialog}
                onUpload={(files) => this.uploadFiles(files)}
                onClose={() => this.setState(update(this.state, {showUploadDialog: {$set: false}}))}/>

            {
                this.props.source.files.length === 0 && <p><i>No files</i></p>
            }
            {   this.props.source.files.length !== 0 &&
                <Table responsive>
                <thead>
                <tr><th>Name</th><th>Type</th><th>Size</th></tr>
                </thead>
                <tbody>
                {
                    this.props.source.files.map((f, i) => {
                        return (<tr key={i}>
                                <td><Glyphicon glyph="file" /> {f.name}</td>
                                <td>{f.kind}</td>
                                <td>{(f.size / (1024 * 1024)).toFixed(2)}MB</td>
                                </tr>);
                    })
                }
                </tbody>
                </Table>
            }
        <p>
        <Button disabled={!this.canUpload} onClick={() => this.setState(update(this.state, {showUploadDialog: {$set: true}}))}>Upload files</Button>
        <Button disabled={this.canUpload || !!this.state.message} onClick={() => this.createAt()}>Create AT</Button> {this.state.message}
        </p>
        </div>)
    }
}


class GroupItem extends Component {

    updateMetadata(metadata) {
        update_group(this.props.group, {metadata: metadata}).then(() => {
            this.props.entry.reload();
        })
    }

    render() {
        return (<div>
            <h3>{this.props.group.metadata.title}</h3>

            <Metadata metadata={this.props.group.metadata} onUpdate={(m) => this.updateMetadata(m)}/>

            {   this.props.group.transcripts.length !== 0 &&
                <Table responsive>
                <thead>
                <tr><th>Name</th></tr>
                </thead>
                <tbody>
                {
                    this.props.group.transcripts.map((f, i) => {
                        return (<tr key={i}>
                                <td><Glyphicon glyph="cog" /> <Link to={{pathname: "/item/" + f._id}}>{f.name}</Link></td>
                                </tr>);
                    })
                }
                </tbody>
                </Table>
            }
        <p>
        </p>
        </div>)
    }
}


class Entry extends Component {

    constructor(props) {
        super(props);
        this.state = {entry: null, sources: [], groups: [], showUploadDialog: false};
    }

    componentDidMount() {
        this.reload();
    }

    reload() {
        let id = this.props.match.params.id;
        fetch_entry(id).then(entry => {
            this.setState(update(this.state, {entry: {$set: entry}}));
        });
        fetch_sources(id).then(items => {
            this.setState(update(this.state, {sources: {$set: items._items}}))
        })
        fetch_groups(id).then(items => {
            let i = 0;
            for (let g of items._items) {
                g.transcripts = [];
                let ii = i;
                fetch_transcripts(g._id).then(items => {
                    let up = {groups: {}};
                    up.groups[ii] = {transcripts: {$set: items._items}};
                    this.setState(update(this.state, up));
                })
                i += 1;
            }
            this.setState(update(this.state, {groups: {$set: items._items}}))

        })
    }

    newSourceItem() {
        create_source({
            entry: this.state.entry._id,
            metadata: {
                title: this.state.entry.name,
            },
            files: []
        }).then(() => {
            this.reload();
        })
    }

    render() {
        return (
                <div>
                {this.state.entry && (
                        <div>
                        <h1>{this.state.entry.name}</h1>
                        <h2>Source items</h2>
                        <p>
                        <Button onClick={() => this.newSourceItem()}>New source item</Button>
                        </p>
                        <ListGroup>
                            {this.state.sources.map((s) => <ListGroupItem key={s._id}><SourceItem source={s} entry={this}/></ListGroupItem>)}
                        </ListGroup>

                        <h2>Annotated Transcripts</h2>
                        <ListGroup>
                            {this.state.groups.map((s) => <ListGroupItem key={s._id}><GroupItem group={s} entry={this}/></ListGroupItem>)}
                        </ListGroup>

                        </div>
                )}
                </div>
        );
    }

}

        export default Entry;
