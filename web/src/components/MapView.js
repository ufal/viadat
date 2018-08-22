import React, { Component } from 'react';

import { Map, TileLayer, withLeaflet, Marker, Popup } from 'react-leaflet';
import { Button, Modal} from 'react-bootstrap';

import { ReactLeafletSearch } from 'react-leaflet-search'

import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});


const Search = withLeaflet(ReactLeafletSearch)

const DEFAULT_VIEWPORT = {
  center: [50.0884, 14.40402],  // Malostraneske namesti
  zoom: 16,
}

export let MyMarker = (props) => <Marker position={{lat: props.location.coordinates[0], lng: props.location.coordinates[1]}}>{props.children && <Popup>{props.children}</Popup>}</Marker>

export class LocationSelectDialog extends Component {

  constructor(props) {
    super(props);
    this.state = {
      location: this.props.location && this.props.location.coordinates
    }
  }

  onClick = (e) => {
    this.setState({
      ...this.state,
      location: [e.latlng.lat, e.latlng.lng]
    })
  }

  onClose = () => {
    this.props.onClose(false);
  }

  onSave = () => {
    this.props.onClose(true, {type: "Point", coordinates: this.state.location});
  }

  render() {
    let props = this.props;
    return (
        <Modal show={props.show} onHide={this.onClose}>
        <Modal.Header closeButton>
            <Modal.Title>Select location</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MapView location={this.props.location} onClick={this.onClick}>
            {this.state.location &&
                <Marker position={this.state.location}>
                </Marker>
            }}
          </MapView>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.onSave}>Set position</Button>
        </Modal.Footer>
    </Modal>);
}


}

/*
        <Marker position={[50.0884, 14.40402]}>
        <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
        <Marker position={[50.0884, 14.40422]}></Marker>*/

export default class MapView extends Component {

  constructor(props) {
    super(props);
    let viewport = DEFAULT_VIEWPORT;
    if (props.viewport) {
      viewport = props.viewport;
    }
    if (props.location) {
        viewport = {...viewport, center: this.props.location.coordinates};
    }
    this.state = {
      viewport: viewport,
    }
  }

  onViewportChanged = viewport => {
    this.setState({ viewport });
  }

  render() {
    return (
      <Map
        onClick={this.props.onClick}
        onViewportChanged={this.onViewportChanged}
        viewport={this.state.viewport}>
        <TileLayer
          attribution="&amp;copy <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Search/>
        {this.props.children}
      </Map>
    )
  }
}
