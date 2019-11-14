import React, { Component } from "react";
import "./App.css";
import {
  Navbar,
  Nav,
  NavItem,
  Glyphicon,
  MenuItem,
  NavDropdown
} from "react-bootstrap";
import {
  Route,
  BrowserRouter,
  Switch,
  NavLink,
  Redirect
} from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import { AuthData } from "./services/utils";
import { try_load_auth_data, logout } from "./services/auth";
import update from "react-addons-update";
import Home from "./components/Home.js";
import Entries from "./components/Entries.js";
import Entry from "./components/Entry.js";
import Item from "./components/annotate/Item.js";
import Search from "./components/search/Search.js";
import Labels from "./components/gis/Labels.js";
import Login from "./components/Login.js";
import Export from "./components/Export.js";
import Stats from "./components/Stats.js";
import Narrators from "./components/Narrators.js";
import Narrator from "./components/Narrator.js";

const ProtectedRoute = ({ component: Component, ...rest }) => (
  <Route
    {...rest}
    render={props =>
      AuthData.username ? (
        <Component {...props} />
      ) : (
        <Redirect
          to={{
            pathname: "/login",
            state: { from: props.location }
          }}
        />
      )
    }
  />
);

class App extends Component {
  constructor() {
    super();
    try_load_auth_data();
    if (AuthData.username) {
      this.state = { username: AuthData.username };
    } else {
      this.state = { username: null }
    }
  }

  afterLogin(username) {
    this.setState(update(this.state, { username: { $set: username } }));
  }

  logout = () => {
    logout();
    window.location.reload();
  }

  render() {
    return (
      <BrowserRouter>
        <div>
          <Navbar>
            <Navbar.Header>
              <Navbar.Brand>
                <NavLink to="/">Viadat</NavLink>
              </Navbar.Brand>
            </Navbar.Header>

            <Nav>
              <LinkContainer to="/entries">
                <NavItem href="">Entries</NavItem>
              </LinkContainer>

              <LinkContainer to="/narrators">
                <NavItem href="">Narrators</NavItem>
              </LinkContainer>

              <LinkContainer to="/search">
                <NavItem href="">Search</NavItem>
              </LinkContainer>

              <LinkContainer to="/labels">
                <NavItem href="">Labels</NavItem>
              </LinkContainer>

              <LinkContainer to="/export">
                <NavItem href="">Export</NavItem>
              </LinkContainer>
            </Nav>

            {this.state.username && (
              <Nav pullRight>
                <NavDropdown
                  eventKey={3}
                  title={
                    <span>
                      <Glyphicon glyph="user" /> {this.state.username}
                    </span>
                  }
                >
                  <MenuItem eventKey={3.1}>Profile</MenuItem>
                  <MenuItem eventKey={3.2} onClick={this.logout}>Logout</MenuItem>
                </NavDropdown>
              </Nav>
            )}
          </Navbar>

          <div className="container">
            <Switch>
              <Route path="/login" component={() => <Login app={this} />} />
              <ProtectedRoute path="/search" component={Search} />
              <ProtectedRoute path="/labels" component={Labels} />
              <ProtectedRoute path="/entry/:id" component={Entry} />
              <ProtectedRoute path="/item/:id" component={Item} />
              <ProtectedRoute path="/stats/:id" component={Stats} />
              <ProtectedRoute path="/entries" component={Entries} />
              <ProtectedRoute path="/narrators" component={Narrators} />
              <ProtectedRoute path="/narrator/:id" component={Narrator} />
              <ProtectedRoute path="/export" component={Export} />
              <ProtectedRoute exact path="/" component={Home} />
            </Switch>
          </div>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
