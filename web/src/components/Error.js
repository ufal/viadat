import React from 'react';
import { Alert } from 'react-bootstrap';


export let Error = (props) => {
    return (<div>
    { props.message && <Alert bsStyle="danger">
        {props.message}
    </Alert>}
    </div>);
};
