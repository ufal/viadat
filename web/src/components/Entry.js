import React, { Component } from 'react';
import update from 'react-addons-update';
import { Button, Glyphicon, ListGroup, ListGroupItem, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { SERVER_URL } from '../config.js';
import {
    autodetect_source_metadata,
    create_source,
    create_transcription,
    fetch_entry,
    fetch_groups,
    fetch_sources,
    fetch_transcripts,
    remove_entry,
    remove_group,
    remove_source,
    update_group,
    update_source,
    upload_at_files,
    upload_source_files,
} from '../services/entries';
import { Metadata } from './Metadata';
import { Upload } from './Upload';

const FileDownloadLink = props =>
    <a href={SERVER_URL + "download/" + props.file.uuid + "/" + props.file.name + (props.suffix || "")}>{props.children}</a>


const LabelDownloadLink = props =>
    <a href={SERVER_URL + "transcript-download/" + props.id + "/" + props.name}>{props.children}</a>


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

    removeSource = () => {
        remove_source(this.props.source).then(() => {
            this.props.entry.reload();
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
                <tr><th>Name</th><th>Type</th><th>Size</th><th>Download</th></tr>
                </thead>
                <tbody>
                {
                    this.props.source.files.map((f, i) => {
                        return (<tr key={i}>
                                <td><Glyphicon glyph="file" /> {f.name}</td>
                                <td>{f.kind}</td>
                                <td>{(f.size / (1024 * 1024)).toFixed(2)}MB</td>
                                <td><FileDownloadLink file={f}>Download</FileDownloadLink></td>
                                </tr>);
                    })
                }
                </tbody>
                </Table>
            }
        <p>
        <Button disabled={!this.canUpload} onClick={() => this.setState(update(this.state, {showUploadDialog: {$set: true}}))}>Upload files</Button>{" "}
        <Button disabled={!this.canUpload} onClick={this.removeSource}>Remove</Button>{" "}
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

    onRemove = () => {
        remove_group(this.props.group).then(() => {
            this.props.entry.reload();
        })
    }

    render() {
        return (<div>
            <h3>{this.props.group.metadata.title}</h3>

            <Metadata metadata={this.props.group.metadata} onUpdate={(m) => this.updateMetadata(m)}/>

            {   this.props.group.transcripts.length !== 0 &&
                <div>
                <Table responsive>
                <thead>
                <tr><th>Name</th><th>Statistics</th><th>Download</th></tr>
                </thead>
                <tbody>
                {
                    this.props.group.transcripts.map((f, i) => {
                        return (<tr key={i}>
                                <td><Glyphicon glyph="cog" /> <Link to={{pathname: "/item/" + f._id}}>{f.name}</Link></td>
                                <td>
                                    <Link to={"/stats/" + f._id}>Statistics</Link>
                                </td>
                                <td><FileDownloadLink file={f} suffix=".xml">Transcript</FileDownloadLink>{" / "}
                                    <LabelDownloadLink id={f._id} name={f.name + ".labels.xml"}>Labels</LabelDownloadLink></td>
                                </tr>);
                    })
                }
                </tbody>
                </Table>
                <Button onClick={this.onRemove}>Remove</Button>
                </div>
            }
        <p>
        </p>
        </div>)
    }
}


class Entry extends Component {

    constructor(props) {
        super(props);
        this.state = {entry: null, sources: [], groups: [], showAtUploadDialog: false};
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
                "dc_title": this.state.entry.name,
            },
            files: []
        }).then(() => {
            this.reload();
        })
    }

    uploadAtFiles(files) {
        return upload_at_files(this.state.entry._id, files).then(() => {
            this.setState(update(this.state, {showAtUploadDialog: {$set: false}}));
            this.reload();
        })
    }

    onRemove = () => {
        remove_entry(this.state.entry).then(() => {
            this.props.history.push("/entries")
        });
    }

    render() {
        return (
                <div>
                {this.state.entry && (
                        <div>
                        <h1>{this.state.entry.name}</h1>
                        <h2>Source items</h2>

                        <p>
                        <Button onClick={() => this.newSourceItem()}>New source item</Button>{" "}
                        <Button disabled={this.state.sources.length !== 0} onClick={this.onRemove}>Remove entry</Button>
                        </p>
                        <ListGroup>
                            {this.state.sources.map((s) => <ListGroupItem key={s._id}><SourceItem source={s} entry={this}/></ListGroupItem>)}
                        </ListGroup>

                        <h2>Annotated Transcripts</h2>
                        <p>
                        <Button onClick={() => this.setState(update(this.state, {showAtUploadDialog: {$set: true}}))}>Upload AT</Button>
                        </p>
                        <Upload
                            show={this.state.showAtUploadDialog}
                            onUpload={(files) => this.uploadAtFiles(files)}
                            onClose={() => this.setState(update(this.state, {showAtUploadDialog: {$set: false}}))}/>
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
