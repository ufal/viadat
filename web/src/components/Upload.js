
import React, { Component } from 'react';
import { Alert, Modal, Button, Table, Glyphicon } from 'react-bootstrap';
import update from 'react-addons-update';


let FilePicker = (props) => {
  let inputElement = null;
  return (<div>
      <input onChange={(e) => props.onChange(e.target.files)} multiple ref={(e) => inputElement = e} style={{display: "none"}} type="file"/>
      <Button onClick={() => {
        inputElement.click();
      }}>Add files</Button>
    </div>);
}

export class Upload extends Component {

  constructor(props) {
    super(props);
    this.state = {
      files: [],
      uploading: false,
    }
  }

  addFiles(files) {
    let fs = []
    for (let f of files) {
      fs.push(f);
    }
    this.setState(update(this.state, {files: {$push: fs}}));
  }

  removeFile(index) {
    this.setState(update(this.state, {files: {$splice: [[index, 1]]}}));
  }

  onUpload() {
    /*let p = Promise.resolve();
    for (let f of this.state.files) {
      p = p.then(() => this.props.onUpload(f));
    }*/
    //return p;
    this.setState(update(this.state, {uploading: {$set: true}}));
    this.props.onUpload(this.state.files);
  }

  render() {
    let props = this.props;
    //<FormControl id="fileInput" onChange={this.handleChange} value={this.state.text} type="file"/>
    //<FormControl multiple type="file" onChange={(e) => this.addFile(e.target.files)}/>
    return (<Modal show={props.show} onHide={() => {props.onClose();}}>
    <Modal.Header closeButton>
        <Modal.Title>Upload files</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {this.state.uploading && <Alert bsStyle="info">
        Uploading ...
      </Alert>}
      {!this.state.uploading &&
      <div>
      <FilePicker onChange={(files) => this.addFiles(files)}/>
      <Table responsive>
          <thead>
            <tr><th>Files</th><th>Size</th><th>Remove</th></tr>
          </thead>
          <tbody>
            {this.state.files.map((f, i) => <tr key={f.name}>
              <td><Glyphicon glyph="file"/> {f.name}</td>
              <td>{(f.size / (1024 * 1024)).toFixed(2)}MB</td>
              <td><Button onClick={() => this.removeFile(i)}><Glyphicon glyph="remove"/></Button></td>
            </tr>)}
          </tbody>
      </Table></div>}
      <Modal.Footer>
      <Button onClick={() => this.onUpload()} disabled={!this.state.files.length || this.state.uploading}>Upload files</Button>
      </Modal.Footer>
    </Modal.Body>
  </Modal>);
  }

}

export default Upload;
