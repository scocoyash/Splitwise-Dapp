import React, { Component } from 'react';

import EthBalanceDisplay from './EthBalanceDisplay'
import {BigNumber} from 'bignumber.js';


import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Button } from 'reactstrap';

  import {
    BrowserRouter as Router,
    Route,
    Link
  } from 'react-router-dom'

import SETokenJSON from '../build/contracts/SEToken.json'
import { NETWORK_ID } from './Channel';


class NavBar extends Component {

  constructor(props) {
    super(props);

      const SETAddress = SETokenJSON.networks[NETWORK_ID].address;
      const SETABI = SETokenJSON.abi;

      const seToken = new props.web3.eth.Contract(SETABI,SETAddress);
      const seToken_event = new props.web3WH.eth.Contract(SETABI,SETAddress);
      seToken_event.setProvider(props.web3WH.currentProvider);

      this.state = {
        web3: props.web3,
        web3WH: props.web3WH,
        seToken:seToken,
        seToken_event:seToken_event
      };

      this.handleGetTokens = this.handleGetTokens.bind(this);

    }

    async componentDidMount(){
      var _this = this;

      var accounts;
      this.state.web3.eth.getAccounts().then(res => {
        accounts = res;
        this.setState({accounts:accounts});
        this.state.seToken.methods.balanceOf(this.state.accounts[0]).call()
        .then(function(res){
          _this.setState({tokenBalance:_this.state.web3.utils.fromWei(res)});
        });
      })

      this.state.seToken_event.events.Transfer({ fromBlock: 'latest', toBlock: 'latest' })
      .on('data', event => {
          //console.log("QQQ",event.returnValues._message);
          _this.state.seToken.methods.balanceOf(_this.state.accounts[0]).call()
          .then(function(res){
            _this.setState({tokenBalance:_this.state.web3.utils.fromWei(res)});
          });
      });


    }

    async handleGetTokens(){
      var _this = this;
      await this.state.seToken.methods.getTokens(
        this.state.accounts[0],
        this.state.web3.utils.toWei("100000")
      ).send({from:this.state.accounts[0]})
      .then(function(receipt){
        _this.state.seToken.methods.balanceOf(_this.state.accounts[0]).call()
        .then(function(res){
          _this.setState({tokenBalance:_this.state.web3.utils.fromWei(res)});
        });
      });
    }

    render() {
      return (
        <div>
        <Navbar color="light" light expand="md">
          <NavbarBrand href="/"><span className="display-4">Splitwise Dapp</span></NavbarBrand>
          <NavbarToggler onClick={this.toggle} />
          <Collapse isOpen={this.state.isOpen} navbar>
            <Nav className="ml-auto" navbar>
              <NavItem>
                <NavLink><Button className="btn btn-primary" href="" onClick={() => this.handleGetTokens()}> Get DAI ({this.state.tokenBalance} DAI) </Button></NavLink>
              </NavItem>
              {/* <NavItem>
                <NavLink><Link href="" to="/wallet"><EthBalanceDisplay web3={this.state.web3} web3WH={this.state.web3WH} /></Link></NavLink>
              </NavItem>
              <NavItem>
                <NavLink><Link href="" to="/">Home</Link></NavLink>
              </NavItem>
              <NavItem>
                <NavLink><Link href="" to="/about">About</Link></NavLink>
              </NavItem>
              <UncontrolledDropdown nav inNavbar>
                <DropdownToggle nav caret>
                  Options
                </DropdownToggle>
                <DropdownMenu right>
                  <DropdownItem>
                    Option 1
                  </DropdownItem>
                  <DropdownItem>
                    Option 2
                  </DropdownItem>
                  <DropdownItem divider />
                  <DropdownItem>
                    Reset
                  </DropdownItem>
                </DropdownMenu>
              </UncontrolledDropdown> */}
            </Nav>
          </Collapse>
        </Navbar>
      </div>
      )
    }
  }

  export default NavBar;
