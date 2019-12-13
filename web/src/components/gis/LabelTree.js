import React, { Component } from "react";
import update from "react-addons-update";
import {
  Button,
  Collapse,
  ControlLabel,
  DropdownButton,
  FormControl,
  FormGroup,
  Glyphicon,
  ListGroup,
  ListGroupItem,
  MenuItem,
  Panel
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import { CirclePicker } from 'react-color';

import {
  create_label,
  create_labelcategory,
  fetch_labelcategories,
  fetch_labels,
  remove_labelcategory
} from "../../services/labels.js";
import { AreaSelectorMapView, MyMarker } from "./MapView";

let LabelItem = props => {
  return (
    <ListGroupItem>
      <a role="button" onClick={() => props.onLabelSelect(props.node)}>
        <Glyphicon glyph="tag" /> {props.node.name}
      </a>
    </ListGroupItem>
  );
};

class CategoryEditor extends Component {
  constructor(props) {
    super(props);
    this.initState = { category: { name: "", color: "" } };
    this.state = this.initState;
  }

  reset() {
    this.setState(this.initState);
  }

  get validState() {
    return this.state.category.name ? "success" : "error";
  }

  onSubmit(e) {
    e.preventDefault();
    if (this.validState === "success") {
      this.props.onSubmit(this.state.category);
      this.reset();
    }
  }

  onColorChange = (value) => {
    this.setState({...this.state, category: {...this.state.category, color: value.hex}});
  }

  render() {
    return (
      <Panel>
        <form onSubmit={e => this.onSubmit(e)}>
          <FormGroup validationState={this.validState}>
            <ControlLabel>Category name</ControlLabel>
            <FormControl
              type="text"
              value={this.state.category.name}
              placeholder="Enter text"
              onChange={e =>
                this.setState(
                  update(this.state, {
                    category: { name: { $set: e.target.value } }
                  })
                )
              }
            />
            <FormControl.Feedback />
          </FormGroup>
          <FormGroup>
            <ControlLabel>Category color</ControlLabel>
              <CirclePicker onChangeComplete={this.onColorChange} color={this.state.category.color}/>
          </FormGroup>

          <Button
            bsStyle="primary"
            type="submit"
            disabled={this.validState !== "success"}
            onClick={e => this.onSubmit(e)}
          >
            Create category
          </Button>
          <Button type="submit" onClick={this.props.onCancel}>
            Cancel
          </Button>
        </form>
      </Panel>
    );
  }
}

class DateFilter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enable: false,
      begin: undefined,
      end: undefined
    };
  }

  toggleEnable = event => {
    console.log(event);
    this.update({ ...this.state, enable: !this.state.enable });
  };

  onFromDate = (date, date2) => {
    this.update({ ...this.state, begin: date });
  };

  onToDate = date => {
    this.update({ ...this.state, end: date });
  };

  update(state) {
    let begin, end;
    if (!state.enable) {
      begin = null;
      end = null;
    } else {
      begin = state.begin;
      end = state.end;
    }
    this.props.onChange({
      begin: begin,
      end: end
    });
    this.setState(state);
  }

  render() {
    return (
      <FormGroup controlId="status">
        <ControlLabel />
        <Button onClick={this.toggleEnable} active={this.state.enable}>
          Date filter
        </Button>
        {this.state.enable && (
          <div>
            From:
            <DatePicker
              selected={this.state.begin}
              onChange={this.onFromDate}
            />
            To:
            <DatePicker selected={this.state.end} onChange={this.onToDate} />
          </div>
        )}
      </FormGroup>
    );
  }
}

class LabelEditor extends Component {
  constructor(props) {
    super(props);
    this.initState = { category: { name: "" } };
    this.state = this.initState;
  }

  reset() {
    this.setState(this.initState);
  }

  get validState() {
    return this.state.category.name ? "success" : "error";
  }

  onSubmit(e) {
    e.preventDefault();
    if (this.validState === "success") {
      this.props.onSubmit(this.state.category);
      this.reset();
    }
  }

  render() {
    return (
      <Panel>
        <form onSubmit={e => this.onSubmit(e)}>
          <FormGroup validationState={this.validState}>
            <ControlLabel>Label name</ControlLabel>
            <FormControl
              type="text"
              value={this.state.category.name}
              placeholder="Enter text"
              onChange={e =>
                this.setState(
                  update(this.state, {
                    category: { name: { $set: e.target.value } }
                  })
                )
              }
            />
            <FormControl.Feedback />
          </FormGroup>
        </form>
        <Button
          bsStyle="primary"
          type="submit"
          disabled={this.validState !== "success"}
          onClick={e => this.onSubmit(e)}
        >
          Create label
        </Button>
        <Button type="submit" onClick={this.props.onCancel}>
          Cancel
        </Button>
      </Panel>
    );
  }
}

class LabelCategory extends Component {
  constructor(props) {
    super(props);
    this.state = { showChilds: false, showEditor: null };
  }

  get labels() {
    let filter = this.props.filter;
    if (!filter || (!filter.begin && !filter.end && !filter.area)) {
      return this.props.node.labels;
    }

    let from_date = filter.begin ? new Date(filter.begin) : null;
    let to_date = filter.end ? new Date(filter.end) : null;
    return this.props.node.labels.filter(label => {
      if (filter.area) {
        if (!label.location) {
          return false;
        }
        let c = label.location.coordinates;
        let a1 = filter.area[0];
        let a2 = filter.area[1];
        if (c[0] < a1[0] || c[0] > a2[0] || c[1] < a1[1] || c[1] > a2[1]) {
          console.log("FF", c, a1, a2);
          return false;
        }
        console.log("PASS", c, a1, a2);
      }
      if (from_date || to_date) {
        if (!label.from_date && !label.to_date) {
          return false;
        }
        if (label.from_date && to_date) {
          let d = new Date(label.from_date);
          if (d > to_date) {
            return false;
          }
        }
        if (label.to_date && from_date) {
          let d = new Date(label.from_date);
          if (d < from_date) {
            return false;
          }
        }
      }
      return true;
    });
  }

  onRemoveCategory = () => {
    remove_labelcategory(this.props.node).then(() => {
      this.props.tree.reload();
    });
  };

  render() {
    let node = this.props.node;
    //let style = { backgroundColor: node.bg_color, color: node.color };
    let style = {};
    return (
      <ListGroupItem style={style}>
        <a role="button" onClick={() => this.toggle()}>
          <Glyphicon
            glyph={this.state.showChilds ? "menu-down" : "menu-right"}
          />{" "}
          {node.name}
        </a>
        {node.color && node.color.length > 0 &&
          <svg style={{marginLeft: "0.5em"}} width="1em" height="1em">
            <rect x="0" y="0" width="1em" height="1em" style={{fill: node.color}}/>
          </svg>
        }

        {this.state.showChilds && (
          <DropdownButton
            bsSize="xsmall"
            style={{ marginLeft: "1em", marginBottom: "0.5em" }}
            id="category-settings"
            title="Edit"
          >
            <MenuItem
              onClick={() =>
                this.setState(
                  update(this.state, { showEditor: { $set: "new-label" } })
                )
              }
            >
              New label
            </MenuItem>
            <MenuItem
              onClick={() =>
                this.setState(
                  update(this.state, { showEditor: { $set: "new-cat" } })
                )
              }
            >
              New sub-category
            </MenuItem>
            <MenuItem onClick={this.onRemoveCategory}>Remove category</MenuItem>
          </DropdownButton>
        )}

        <Collapse in={this.state.showEditor === "new-cat"}>
          <div>
            <CategoryEditor
              onSubmit={category => this.newSubcategory(category)}
              onCancel={() =>
                this.setState(
                  update(this.state, { showEditor: { $set: null } })
                )
              }
            />
          </div>
        </Collapse>
        <Collapse in={this.state.showEditor === "new-label"}>
          <div>
            <LabelEditor
              onSubmit={label => this.newLabel(label)}
              onCancel={() =>
                this.setState(
                  update(this.state, { showEditor: { $set: null } })
                )
              }
            />
          </div>
        </Collapse>

        <Collapse in={this.state.showChilds}>
          <ListGroup>
            {node.childs.map(node => (
              <LabelCategory
                filter={this.props.filter}
                key={node._id}
                node={node}
                tree={this.props.tree}
                onLabelSelect={this.props.onLabelSelect}
              />
            ))}
            {this.labels.map(node => (
              <LabelItem
                key={node._id}
                node={node}
                tree={this.props.tree}
                onLabelSelect={this.props.onLabelSelect}
              />
            ))}
            {node.childs.length === 0 && node.labels.length === 0 && (
              <span>
                <i>Empty</i>
              </span>
            )}
          </ListGroup>
        </Collapse>
      </ListGroupItem>
    );
  }

  newSubcategory(category) {
    category.parent = this.props.node._id;
    create_labelcategory(category).then(() => {
      this.setState(update(this.state, { showEditor: { $set: null } }));
      this.props.tree.reload();
    });
  }

  newLabel(label) {
    label.parent = this.props.node._id;
    create_label(label).then(() => {
      this.setState(update(this.state, { showEditor: { $set: null } }));
      this.props.tree.reload();
    });
  }

  toggle() {
    this.setState({ showChilds: !this.state.showChilds });
  }
}

class LabelTree extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showNewTopLevel: false,
      nodes: [],
      labels: [],
      filter: { begin: null, end: null, area: null }
    };
  }

  componentDidMount() {
    this.reload();
  }

  reload() {
    Promise.all([fetch_labelcategories(), fetch_labels()]).then(data => {
      let map = new Map();
      let nodes = [];
      for (let item of data[0]._items) {
        item.childs = [];
        item.labels = [];
        map.set(item._id, item);
      }
      for (let item of data[0]._items) {
        if (item.parent) {
          let p = map.get(item.parent);
          if (p) {
            p.childs.push(item);
          } else {
            console.log("Orphan label:", item);
          }
        } else {
          nodes.push(item);
        }
      }
      for (let item of data[1]._items) {
        map.get(item.parent).labels.push(item);
      }
      this.setState({ ...this.state, nodes, labels: data[1]._items });
    });
  }

  onDateFilterChange = filter => {
    this.setState({
      ...this.state,
      filter: { ...this.state.filter, ...filter }
    });
  };

  onMapFilter = rect => {
    this.setState({
      ...this.state,
      filter: { ...this.state.filter, area: rect }
    });
  };

  render() {
    return (
      <div>
          <h2>Filter the existing labels</h2>
        {this.props.showMap && (
            <div>
              <h3>By selecting an area on the map</h3>
          <AreaSelectorMapView
            viewport={{ center: [50.0884, 14.40402], zoom: 16 }}
            onSelect={this.onMapFilter}
          >
            {this.state.labels
              .filter(label => label.location)
              .map((label, i) => (
                <MyMarker key={i} location={label.location}>
                  {label.name}
                </MyMarker>
              ))}
          </AreaSelectorMapView>
            </div>
        )}
        <h3>By setting a date filter</h3>
        <DateFilter onChange={this.onDateFilterChange} />
        <h3>Edit the existing categories</h3>
        <ListGroup>
          {this.state.nodes.map(node => (
            <LabelCategory
              filter={this.state.filter}
              key={node._id}
              node={node}
              tree={this}
              onLabelSelect={this.props.onLabelSelect}
            />
          ))}
        </ListGroup>
          <h3>Create new</h3>
        <Button
            onClick={() =>
                this.setState(
                    update(this.state, { showNewTopLevel: { $set: true } })
                )
            }
        >
          New top level category
        </Button>
        <Collapse in={this.state.showNewTopLevel}>
          <div>
            <CategoryEditor
                onSubmit={c => this.onNewTopLevel(c)}
                onCancel={() =>
                    this.setState(
                        update(this.state, { showNewTopLevel: { $set: false } })
                    )
                }
            />
          </div>
        </Collapse>
      </div>
    );
  }

  onNewTopLevel(category) {
    create_labelcategory(category)
      .then(data => {
        this.reload();
        this.setState(update(this.state, { showNewTopLevel: { $set: false } }));
      })
      .catch(e => {
        alert("Creating new category failed: " + e);
      });
    //this.setState(update(this.state, {showNewTopLevel: {$set: false}}));
  }
}

export default LabelTree;
