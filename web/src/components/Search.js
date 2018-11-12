import React, { Component } from 'react';
import { Button, ControlLabel, FormControl, FormGroup, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { fetch_search } from '../services/search.js';


let ResultRow = props => {
    return(<tr>
        <td>
            <Link to={{pathname: "item/" + props.transcript._id, search: "?lemma=" + props.lemmas[0]}}>{props.transcript.name}</Link>
        </td>
    </tr>)
}

class Search extends Component {

    constructor(props) {
        super(props);
        this.state = {searchText: "", resultsFor: null, results: null, lemmas: null};
    }

    handleChange(e) {
        this.setState({...this.state, searchText: e.target.value});
    }

    handleSearch(e) {
        e.preventDefault();
        fetch_search(this.state.searchText).then(r => {
            this.setState({...this.state, resultsFor: this.state.searchText, searchText: "", lemmas: r.lemmas, results: r.results});
        });
    }

    render() {
        return(<div>
            <form>
            <FormGroup>
            <ControlLabel>Search:</ControlLabel>

            <FormControl
                type="text"
                value={this.state.searchText}
                placeholder="Enter text"
                onChange={e => this.handleChange(e)}
            />
            </FormGroup>
            <Button type="submit" onClick={(e) => this.handleSearch(e)}>Search</Button>
            {
                this.state.results !== null && (
                <div>
                <h2>Results for '{this.state.resultsFor}'</h2>
                {this.state.results.length > 0 && <Table responsive>
                    <thead>
                        <tr><th>Item</th></tr>
                    </thead>
                    <tbody>
                    {this.state.results.map(r => <ResultRow key={r._id} transcript={r} lemmas={this.state.lemmas}/>)}
                    </tbody>
                </Table>}
                {this.state.results.length === 0 && <span>No results</span>}
                </div>
                )
            }
            </form>
            </div>)
    }

}

export default Search;

