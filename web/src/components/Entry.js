import React, { Component } from "react";
import update from "react-addons-update";
import {
  Button,
  Glyphicon,
  ListGroup,
  ListGroupItem,
  Table,
  FormControl,
  FormGroup,
  Modal,
  ControlLabel
} from "react-bootstrap";
import { Link } from "react-router-dom";

import { SERVER_URL } from "../config.js";
import {
  autodetect_source_metadata,
  create_source,
  create_transcription,
  duplicate_source,
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
  update_entry
} from "../services/entries";
import { Metadata } from "./Metadata";
import { Upload } from "./Upload";
import "./entry.css";


class EntryNameDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: props.entry.name
    };
  }

  getValidationState() {
    if (this.state.name.length > 1) {
      return "success";
    } else {
      return "error";
    }
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
          <Modal.Title>Entry: {this.state.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormGroup
            controlId="name"
            validationState={this.getValidationState()}
          >
            <ControlLabel>Name</ControlLabel>
            <FormControl
              value={this.state.name}
              onChange={e =>
                this.setState({...this.state, name: e.target.value})
              }
            />
          </FormGroup>

          <Modal.Footer>
            {this.state.message}{" "}
            {this.props.onAutodetect && (
              <Button disabled={this.disabled} onClick={this.autodetect}>
                Autodetect
              </Button>
            )}
            <Button
              disabled={this.disabled}
              onClick={() => {
                this.props.onUpdate({name: this.state.name});
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


const FileDownloadLink = props => (
  <a
    href={
      SERVER_URL +
      "download/" +
      props.file.uuid +
      "/" +
      props.file.name +
      (props.suffix || "")
    }
  >
    {props.children}
  </a>
);

const LabelDownloadLink = props => (
  <a href={SERVER_URL + "transcript-download/" + props.id + "/" + props.name}>
    {props.children}
  </a>
);

class SourceItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showUploadDialog: false,
      showAtUploadDialog: false,
    };
  }

  uploadFiles(files) {
    return upload_source_files(this.props.source._id, files).then(() => {
      this.setState(update(this.state, { showUploadDialog: { $set: false } }));
      this.props.entry.reload();
    });
  }

  updateMetadata = metadata => {
    update_source(this.props.source, { metadata: metadata }).then(() => {
      this.props.entry.reload();
    });
  };

  autodetectMetadata = _ => {
    return autodetect_source_metadata(this.props.source._id);
  };

  get canUpload() {
    let s = this.props.source.metadata.status;
    return s === undefined || s === "x" || s === "r";
  }

  createAt() {
    this.setState(update(this.state, { message: { $set: "Creating ..." } }));
    create_transcription(this.props.source._id).then(e => {
      console.log(e);
        this.setState(update(this.state, { message: { $set: e } }));
        this.props.entry.reload();
    }, e => {
      this.setState(
        update(this.state, { message: { $set: "Failed: " + e.statusText } })
      );
    });
  }

  removeSource = () => {
    if (window.confirm("Remove source?")) {
        remove_source(this.props.source).then(() => {
        this.props.entry.reload();
      });
    }
  };

  uploadAtFiles(files) {
    return upload_at_files(this.props.entry.state.entry._id, files).then(() => {
          this.setState(
              update(this.state, { showAtUploadDialog: { $set: false } })
          );
          this.props.entry.reload();
        },
        err => {
          console.error("The uploadAtFiles response was not OK.\n");
          err.json().then(jserr=>{window.alert(jserr.error)});
        }
    );
  }

  onDuplicate(source) {
    if (window.confirm("This will clone the source item, you'll have to export it again with a" +
        " different signature.\nYou can then create new AT or upload the AT and labels you have" +
        " here.")) {
      this.setState(update(this.state, { clone_message: { $set: "Cloning ..." } }));
      duplicate_source(source._id).then(() => {
            this.setState(update(this.state, {clone_message: {$set: "Cloned"}}));
            this.props.entry.reload()
          }
      );
    }
  }


  render() {
    return (
      <div>
        <h3>{this.props.source.metadata.dc_title}</h3>

        <Metadata
          metadata={this.props.source.metadata}
          onUpdate={this.updateMetadata}
          onAutodetect={this.autodetectMetadata}
        />

        <Upload
          show={this.state.showUploadDialog}
          onUpload={files => this.uploadFiles(files)}
          onClose={() =>
            this.setState(
              update(this.state, { showUploadDialog: { $set: false } })
            )
          }
        />

        {this.props.source.files.length === 0 && (
          <p>
            <i>No files</i>
          </p>
        )}
        {this.props.source.files.length !== 0 && (
          <Table responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {this.props.source.files.map((f, i) => {
                return (
                  <tr key={i}>
                    <td>
                      <Glyphicon glyph="file" /> {f.name}
                    </td>
                    <td>{f.kind}</td>
                    <td>{(f.size / (1024 * 1024)).toFixed(2)}MB</td>
                    <td>
                      <FileDownloadLink file={f}>Download</FileDownloadLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <p>
          <Button
            disabled={!this.canUpload}
            onClick={() =>
              this.setState(
                update(this.state, { showUploadDialog: { $set: true } })
              )
            }
          >
            Upload files
          </Button>{" "}
          <Button disabled={!this.canUpload} onClick={this.removeSource}>
            Remove
          </Button>{" "}
          <Button
            title={this.canUpload ? "You need to publish the item first." :
                   this.props.hasAT ? "The AT was alreadry created." :
                                        "Create the annotated transcript"}
            disabled={this.canUpload || this.props.hasAT}
            onClick={() => this.createAt()}
          >
            Create AT
          </Button>{" "}
          {this.state.message}
          <Button
              title={this.canUpload ? "You need to publish the item first." :
                  this.props.hasAT ? "The AT was alreadry created." :
                      "Create the annotated transcript"}
              disabled={this.canUpload || this.props.hasAT}
              onClick={() =>
                  this.setState(
                      update(this.state, { showAtUploadDialog: { $set: true } })
                  )
              }
          >
            Upload AT
          </Button>
          <Upload
              show={this.state.showAtUploadDialog}
              accept=".xml"
              onUpload={files => this.uploadAtFiles(files)}
              onClose={() =>
                  this.setState(
                      update(this.state, { showAtUploadDialog: { $set: false } })
                  )
              }
          />
          <Button
              title="Duplicate"
              onClick={() => this.onDuplicate(this.props.source)}
          >
            <Glyphicon glyph="duplicate" />{" "}
          </Button>
          {this.state.clone_message}
        </p>
        <h2>Annotated Transcript</h2>
        <ListGroup>
          {this.props.entry.state.groups.filter(g =>
              g.transcripts && g.transcripts[0] && g.transcripts[0].audio.source._id === this.props.source._id
          ).map(s => (
              <ListGroupItem key={s._id}>
                <GroupItem group={s} entry={this.props.entry} />
              </ListGroupItem>
          ))}
        </ListGroup>
      </div>
    );
  }
}

class GroupItem extends Component {
  onRemove = () => {
    if (window.confirm("Remove group?")) {
      remove_group(this.props.group).then(() => {
        this.props.entry.reload();
      });
    }
  };

  render() {
    return (
      <div>
        {this.props.group.transcripts.length !== 0 && (
        <div >
        <h3>{this.props.group.metadata.dc_title}</h3>
          <div>
            <Table responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Statistics</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {this.props.group.transcripts.map((f, i) => {
                  return (
                    <tr key={i}>
                      <td>
                        <Glyphicon glyph="cog" />{" "}
                        <Link to={{ pathname: "/item/" + f._id }}>
                          {f.name}
                        </Link>
                      </td>
                      <td>
                        <Link to={"/stats/" + f._id}>Statistics</Link>
                      </td>
                      <td>
                        <FileDownloadLink file={f} suffix=".xml">
                          Transcript
                        </FileDownloadLink>
                        {" / "}
                        <LabelDownloadLink
                          id={f._id}
                          name={f.name + ".labels.xml"}
                        >
                          Labels
                        </LabelDownloadLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {this.props.group.metadata.status !== 'p' &&
            <Button
                onClick={e => {
                  const newStatus = this.props.group.metadata.status === 'r' ? 'x' : 'r';
                  const updated = {
                    group: {
                      metadata: {
                        status: newStatus
                      }
                    }
                  };
                  update_group(this.props.group, updated.group).then(() => {
                    this.props.entry.reload()
                  });
                }
                }
            >
              Set as {this.props.group.metadata.status === 'r' ? 'private' :
                'ready'}
            </Button>
            }
          </div>
        <p />
        </div>
        )}
        <Button disabled={this.props.group.metadata.status === 'p'}
                title={this.props.group.metadata.status === 'p' ? "This AT was already published" : "Remove the AT."}
                onClick={this.onRemove}>Remove</Button>
      </div>
    );
  }
}

class Entry extends Component {
  constructor(props) {
    super(props);
    this.state = {
      entry: null,
      sources: [],
      groups: [],
      showNameDialog: false,
    };
  }

  componentDidMount() {
    this.reload();
  }

  reload() {
    let id = this.props.match.params.id;
    fetch_entry(id).then(entry => {
      this.setState(update(this.state, { entry: { $set: entry } }));
    });
    fetch_sources(id).then(items => {
      this.setState(update(this.state, { sources: { $set: items._items } }));
    });
    fetch_groups(id).then(items => {
      let i = 0;
      for (let g of items._items) {
        g.transcripts = [];
        let ii = i;
        fetch_transcripts(g._id).then(items => {
          let up = { groups: {} };
          up.groups[ii] = { transcripts: { $set: items._items } };
          this.setState(update(this.state, up));
        });
        i += 1;
      }
      this.setState(update(this.state, { groups: { $set: items._items } }));
    });
  }

  newSourceItem() {
    create_source({
      entry: this.state.entry._id,
      metadata: {
        dc_title: this.state.entry.name
      },
      files: []
    }).then(() => {
      this.reload();
    });
  }

  onRemove = () => {
    if (window.confirm("Remove entry?")) {
     remove_entry(this.state.entry).then(() => {
        this.props.history.push("/entries");
      });
    }
  };

  onNameUpdate = (update) => {
    update_entry(this.state.entry, update).then(() => {
      this.setState({...this.state, entry: {...this.state.entry, name: update.name}});
    })
  }

  hasAT(source, groups) {
    for (const group of groups){
      for (const t of group.transcripts){
        if(t.audio.source._id === source._id){
          return true;
        }
      }
    }
    return false;
  }


  render() {
    return (
      <div>
        {this.state.entry && (
          <div>
            <EntryNameDialog
                show={this.state.showNameDialog}
                entry={this.state.entry}
                onUpdate={this.onNameUpdate}
                onClose={() => this.setState({...this.state, showNameDialog: false})}
            />
            <h1>{this.state.entry.name}</h1><Button onClick={() => this.setState({...this.state, showNameDialog: true})}>Edit</Button>

            <h2>Source items</h2>
            <p>
              <Button onClick={() => this.newSourceItem()}>
                New source item
              </Button>{" "}
              <Button
                disabled={this.state.sources.length !== 0}
                onClick={this.onRemove}
              >
                Remove entry
              </Button>
            </p>
            <ListGroup>
              {this.state.sources.map(s => (
                <ListGroupItem key={s._id} className="sourceItem">
                  <SourceItem source={s} entry={this} hasAT={this.hasAT(s, this.state.groups)} />
                </ListGroupItem>
              ))}
            </ListGroup>
          </div>
        )}
      </div>
    );
  }
}

export default Entry;
