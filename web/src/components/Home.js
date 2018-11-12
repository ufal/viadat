import React, { Component } from 'react';
import { Button, Grid, Jumbotron } from 'react-bootstrap';

class Home extends Component {

  render() {
    return (
      <Jumbotron>
        <Grid>
          <h1>Viadat</h1>
          <p>
            <Button
              bsStyle="success"
              bsSize="large"
              href="http://react-bootstrap.github.io/components.html"
              target="_blank">
              View React Bootstrap Docs
            </Button>
          </p>
        </Grid>
      </Jumbotron>
    );
  }

}

export default Home;
