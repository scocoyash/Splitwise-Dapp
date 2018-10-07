import React, { Component } from 'react';
import './App.css';
import Web3 from 'web3';

import {
  HashRouter as Router,
  Route} from 'react-router-dom'

import Channel from './components/Channel'
import NavBar from './components/NavBar'
import Wallet from './components/Wallet'
import Expenses from './components/Expenses'

import 'bootstrap/dist/css/bootstrap.css';

const About = () => (
<div>
  <h2>About</h2>
</div>
)

class App extends Component {

  constructor(props) {
    super(props);

    // Web3 providers
    const web3 = new Web3(Web3.givenProvider || "http://kovan.infura.io");
    const web3WH = new Web3();
    const eventProvider = new Web3.providers.WebsocketProvider('ws://localhost:7545')
    web3WH.setProvider(eventProvider)

    this.state = {
      web3: web3,
      web3WH: web3WH,
      accounts:'',
    };

  }

  render() {
    return (

      <div className="App">

        <Router>
          <div className="container-fluid">
            <div>
              <NavBar web3={this.state.web3} web3WH={this.state.web3WH} />
            </div>

            <Route exact path='/' render={() => <Channel web3={this.state.web3} web3WH={this.state.web3WH} />}/>
            <Route path="/about" component={About}/>
            <Route path='/expenses/:channelID' render={(props) => <Expenses web3={this.state.web3} web3WH={this.state.web3WH} match={props.match} />}/>

            <Route path="/wallet" render={() => <Wallet web3={this.state.web3} web3WH={this.state.web3WH} />}/>
          </div>
        </Router>
      </div>
    );
  }
}

export default App;
