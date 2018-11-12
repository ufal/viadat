import React, { Component } from "react";
import update from "react-addons-update";
import {
  Button,
  ControlLabel,
  Form,
  FormControl,
  FormGroup
} from "react-bootstrap";
import { Redirect } from "react-router-dom";

import { auth_login } from "../services/auth.js";
import { Error } from "./Error.js";

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: "test",
      password: "test",
      error: null,
      logged: false
    };
  }

  componentDidMount() {}

  doLogin(e) {
    e.preventDefault();
    this.setState(update(this.state, { error: { $set: null } }));
    let username = this.state.username;
    auth_login(username, this.state.password).then(
      () => {
        this.setState(update(this.state, { logged: { $set: true } }));
        this.props.app.afterLogin(username);
      },
      e => {
        this.setState(update(this.state, { error: { $set: "Login failed" } }));
      }
    );
  }

  render() {
    return (
      <div>
        {this.state.logged && <Redirect to={"/entries"} />}
        <Form onSubmit={e => this.doLogin(e)}>
          <Error message={this.state.error} />
          <FormGroup>
            <ControlLabel>Username</ControlLabel>
            <FormControl
              type="text"
              value={this.state.username}
              placeholder="User name"
              onChange={e =>
                this.setState(
                  update(this.state, { username: { $set: e.target.value } })
                )
              }
            />
            <ControlLabel>Password</ControlLabel>
            <FormControl
              type="password"
              value={this.state.password}
              placeholder="Password"
              onChange={e =>
                this.setState(
                  update(this.state, { password: { $set: e.target.value } })
                )
              }
            />
          </FormGroup>
          <Button type="submit">Login</Button>
        </Form>
      </div>
    );
  }
}

export default Login;
