import React, { Component } from "react";
import update from "react-addons-update";
import { Alert, Button, Glyphicon, Modal, Table } from "react-bootstrap";

let FilePicker = props => {
  let inputElement = null;
  return (
    <div>
      <input
        onChange={e => props.onChange(e.target.files)}
        multiple
        ref={e => (inputElement = e)}
        style={{ display: "none" }}
        type="file"
        accept={props.accept}
      />
      <Button
        onClick={() => {
          inputElement.click();
        }}
      >
        Add files
      </Button>
    </div>
  );
};

export class Upload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      files: [],
      uploading: false
    };
  }

  addFiles(files) {
    let fs = [];
    for (let f of files) {
      fs.push(f);
    }
    this.setState(update(this.state, { files: { $push: fs } }));
  }

  removeFile(index) {
    this.setState(update(this.state, { files: { $splice: [[index, 1]] } }));
  }

  onUpload() {
    var files = this.state.files;
    this.setState({...this.state, files: [], uploading: true });
    this.props.onUpload(files).then(() => {
        this.setState({...this.state, uploading: false });
    })
  }

  render() {
    let props = this.props;
    return (
      <Modal
        show={props.show}
        onHide={() => {
          this.setState({...this.state, files: [], uploading: false });
          props.onClose();
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Upload files</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.state.uploading && <Alert bsStyle="info">Uploading ...</Alert>}
          {!this.state.uploading && (
            <div>
              <FilePicker onChange={files => this.addFiles(files)}
                          accept={props.accept}
              />
              <Table responsive>
                <thead>
                  <tr>
                    <th>Files</th>
                    <th>Size</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.files.map((f, i) => (
                    <tr key={f.name}>
                      <td>
                        <Glyphicon glyph="file" /> {f.name}
                      </td>
                      <td>{(f.size / (1024 * 1024)).toFixed(2)}MB</td>
                      <td>
                        <Button onClick={() => this.removeFile(i)}>
                          <Glyphicon glyph="remove" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          <Modal.Footer>
            <Button
              onClick={() => this.onUpload()}
              disabled={!this.state.files.length || this.state.uploading}
            >
              Upload files
            </Button>
          </Modal.Footer>
        </Modal.Body>
      </Modal>
    );
  }
}

export default Upload;
