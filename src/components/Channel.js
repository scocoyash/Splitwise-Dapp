import React, { Component } from 'react';
import {BigNumber} from 'bignumber.js';
import SplitETHJSON from '../build/contracts/SplitETH.json'
import { Container, Row, Col } from 'reactstrap';
import { Button, Form, FormGroup, Label, Input, Table } from 'reactstrap';
import $ from 'jquery';
import { cleanAsciiText, toWei } from './Expenses';

import {
  Link
} from 'react-router-dom'
import SETokenJSON from '../build/contracts/SEToken.json'
import { API_HOST } from './Expenses';

export const NETWORK_ID = 42;

class Channel extends Component {

  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
    this.handleNewChannel = this.handleNewChannel.bind(this);
    this.handleJoinChannel = this.handleJoinChannel.bind(this);
    this.handleCloseChannel = this.handleCloseChannel.bind(this);
    this.handleSubmitNewChannel = this.handleSubmitNewChannel.bind(this);
    this.handleSubmitJoinChannel = this.handleSubmitJoinChannel.bind(this);
    this.handlePullFundsFromChannel = this.handlePullFundsFromChannel.bind(this);

    const splitETHAddress = SplitETHJSON.networks[NETWORK_ID].address;
    const splitETHABI = SplitETHJSON.abi;

    const SETAddress = SETokenJSON.networks[NETWORK_ID].address;
    const SETABI = SETokenJSON.abi;

    const splitETH = new props.web3.eth.Contract(splitETHABI,splitETHAddress);
    const splitETH_event = new props.web3WH.eth.Contract(splitETHABI,splitETHAddress);
    splitETH_event.setProvider(props.web3WH.currentProvider);

    const seToken = new props.web3.eth.Contract(SETABI,SETAddress);
    const seToken_event = new props.web3WH.eth.Contract(SETABI,SETAddress);
    seToken_event.setProvider(props.web3WH.currentProvider);

    window.postGroupToAPI = this.postGroupToAPI;

    this.state = {
      web3: props.web3,
      web3WH: props.web3WH,
      splitETH:splitETH,
      splitETH_event:splitETH_event,
      seToken:seToken,
      myValue:0,
      selectedOption:0,
      name: '',
      friends: [{ address: '' }],
      groups: []
    };

    //console.log(this.state.seToken._address);
  }

    async componentDidMount(){

      var accounts;
      this.state.web3.eth.getAccounts().then(res => {
        accounts = res;
        this.setState({accounts:accounts});
      });

      // this.state.pabloC.methods.myData().call().then( result => {
      //   this.setState({myValue:result});
      // });

      // this.state.splitETH_event.events.GroupCreated({ fromBlock: 'latest', toBlock: 'latest' })
      // .on('data', event => {
      //     console.log("QQQ",event.returnValues._message);
      //     this.state.pabloC.methods.myData().call().then( result => {
      //       console.log("PAPA",result);
      //       this.setState({myValue:result});
      //     });
      // });

      this.getGroups();
    }

    async getGroups(){
      var _this = this;
      this.state.splitETH_event.getPastEvents('GroupCreated', {
          fromBlock: 0,
          toBlock: 'latest'
      }, function(){})
      .then(async function(events){
        _this.setState({
          groups: []
        });

        console.log("events!!!!! : " + events);

        for (let element of events) {
          console.log("element!!!!! : " + element);
          var friends = [];
          for (let usr of element.returnValues._users) {
            const result = await _this.state.splitETH.methods.groupBalances(element.returnValues._name,usr).call();

            friends.push({
              address:usr,
              balance:result
            })
          }
          const myBal = await _this.state.splitETH.methods.groupBalances(element.returnValues._name,_this.state.accounts[0]).call();

          const result2 = await _this.state.splitETH.methods.groupCloseTime(element.returnValues._name).call();
          console.log("que",result2);
          _this.setState({
            groups: [..._this.state.groups, {
                name: _this.state.web3.utils.toAscii(element.returnValues._name),
                friends: friends,
                timeout: element.returnValues._timeout,
                closed: result2 > 0 ? true : false,
                myBal:myBal
              }]
            });
        }
      });
    }

    async handleSubmitNewChannel(event) {
      console.log(event.target.GroupName.value);
      event.preventDefault();

      var _this = this;

      var groupName = this.state.web3.utils.fromAscii(event.target.GroupName.value);
      var addresses = [];
      this.state.friends.forEach(function(element) {
        addresses.push(element.address);
      });
      var tokenAddress = event.target.TokenAddress.value;
      var expiry = event.target.Expiry.value;
      
      const receipt = await this.state.splitETH.methods.createGroup(
        groupName,
        addresses,
        tokenAddress,
        expiry
      ).send({from:this.state.accounts[0]})

      //console.log(web3.utils.toAscii(receipt.events.GroupCreated.returnValues._name));
      alert(_this.state.web3.utils.toAscii(receipt.events.GroupCreated.returnValues._name) + " Successfully created!");
      _this.setState({selectedOption:0});
      _this.getGroups();

      await this.postGroupToAPI(groupName, addresses.length);

      // receipt can also be a new contract instance, when coming from a "contract.deploy({...}).send()"
    }

    async postGroupToAPI(groupName, participantsAmount) {
      return new Promise(resolve => {
        $.post(`${API_HOST}/group`, {
          name: window.web3.toUtf8(groupName),
          numParticipants: participantsAmount
        }, (data) => {
          console.log('data callback for postGroupToAPI', data);

          resolve(data);
        });
      });
    }

    async handleSubmitJoinChannel(event) {
      //console.log(event.target.GroupName.value);
      event.preventDefault();

      var _this = this;
      
      console.log("Initial Groupname :" + event.target.GroupName.value);
      var groupName = this.state.web3.utils.fromAscii(event.target.GroupName.value);
      var user = event.target.User.value;
      var amount = event.target.Amount.value;

      await this.state.seToken.methods.approve(this.state.splitETH._address,_this.state.web3.utils.toWei(amount,"ether"))
      .send({from:this.state.accounts[0]})
      .then(function(){
          
          console.log("ERC20 approve successful");
          console.log("Groupname :" + groupName + " " + typeof groupName);
          console.log("User :" + user + " " + typeof user);


          _this.state.splitETH.methods.fundUser(
          groupName,
          user,
          _this.state.web3.utils.toWei(amount,"ether")
        ).send({from:_this.state.accounts[0]})
        .then(function(){
          console.log("Split Ether successful");
        _this.setState({selectedOption:0});
          _this.getGroups();
        });
      });


    }

    async handleNewChannel(event) {
      //console.log(event.target.myValueInput.value);
      event.preventDefault();
      this.setState({selectedOption:1});
    }

    async handleJoinChannel(group) {
      console.log(group);
      //event.preventDefault();
      this.setState({
        selectedOption:2,
        selectedGroup:group
      });
    }

    async getLastBillSigned(groupName) {
      return new Promise(resolve => {
        console.debug('before get', groupName);
        const stringifiedName = cleanAsciiText(groupName);
        console.debug(stringifiedName);
        $.get(`${API_HOST}/group/${stringifiedName}/last-bill-signed`, (data) => {
          console.log('data callback for postGroupToAPI', data);

          resolve(data);
        });
      });
    }

    async handleCloseChannel(group) {
      console.debug('handleClosechannel', group);

      const lastBillSigned = await this.getLastBillSigned(group);

      console.debug('handleCloseChannel', {
        lastBillSigned
      });

      console.log(group);
      var _this = this;

      const addressMapping = {

      };

      const vArray = [];
      const rArray = [];
      const sArray = [];
      const weiArray = [];
      const signArray = [];

      lastBillSigned.signatures.map(signature => {
        addressMapping[signature.signer.toLowerCase()] = signature;
      });

      lastBillSigned.totalBalanceChange.map((entry, index) => {
        const sign = parseInt(entry.value) >= 0;
        const wei = toWei(entry.value).toString();

        console.debug("!!", {
          sign,
          wei
        });

        addressMapping[entry.address.toLowerCase()].wei = wei;
        addressMapping[entry.address.toLowerCase()].sign = sign;;
      });



      for (let address of Object.keys(addressMapping)) {
        const entry = addressMapping[address];

        vArray.push(entry.v);
        rArray.push(entry.r);
        sArray.push(entry.s);
        weiArray.push((new BigNumber(entry.wei).absoluteValue().toString()));
        signArray.push(entry.sign);
      }

      const parameters = [
        this.state.web3.utils.fromAscii(group),
        weiArray,
        signArray,
        lastBillSigned.timestamp,
        vArray,
        rArray,
        sArray
      ];

      console.log('closeChannel', parameters);

      await this.state.splitETH.methods.closeGroup(...parameters).send({from:this.state.accounts[0]})
      .then(function(receipt){
        console.log(receipt);
        _this.getGroups();
      });

    }

    async handlePullFundsFromChannel(group) {
      console.log(group);
      var _this = this;
      await this.state.splitETH.methods.pullFunds(
        this.state.web3.utils.fromAscii(group)
      ).send({from:this.state.accounts[0]})
      .then(function(receipt){
        console.log(receipt);
        _this.getGroups();
      });

    }

    handleChange() {
      //this.setState({myValue: event.target.value});
    }

    renderSelectedOption(){
      if(this.state.selectedOption == 1){
        return(
          <Container className="Wallet">
            <Row>
              <Col sm="12" md={{ size: 8, offset: 2 }}>
                {/* {this.state.accounts[0]} (<EthBalanceDisplay web3={this.state.web3} web3WH={this.state.web3WH} />) */}
              </Col>
            </Row>
            <Row>
              <Col sm="12" md={{ size: 8, offset: 2 }}>
                Create New Channel
              </Col>
            </Row>
            <Row>
              <Col sm="12">
                <Form onSubmit={this.handleSubmitNewChannel}>
                  <FormGroup row>
                    <Label for="GroupName" sm={2}>Group Name: </Label>
                    <Col sm={10}>
                      <Input type="text" name="GroupName" placeholder="My new group" />
                    </Col>
                  </FormGroup>

                    {this.state.friends.map((friend, idx) => (
                      <div>
                        <FormGroup row>
                          <Col sm={10}>
                            <Input
                              type="text"
                              placeholder={`Friend #${idx + 1} ETH address`}
                              value={friend.address}
                              onChange={this.handleFriendNameChange(idx)}
                            />
                          </Col>
                          <Col sm={2}>
                            <Button type="button" onClick={this.handleRemoveFriend(idx)} className="small">-</Button>
                          </Col>
                        </FormGroup>
                      </div>
                    ))}
                    <FormGroup row>
                      <Button type="button" onClick={this.handleAddFriend} className="small">Add Friend</Button>
                    </FormGroup>

                  <FormGroup row>
                    <Label for="TokenAddress" sm={2}>DAI Token Address: </Label>
                    <Col sm={10}>
                      <Input type="text" name="TokenAddress" placeholder="0xabcdef" value={this.state.seToken._address}/>
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Label for="Expiry" sm={2}>Expiry Date: </Label>
                    <Col sm={10}>
                      <Input type="text" name="Expiry" placeholder="12345678" />
                    </Col>
                  </FormGroup>
                  <FormGroup check row>
                    <Col sm={{ size: 12, offset: 0 }}>
                      <Button>Create new Channel</Button>
                    </Col>
                  </FormGroup>
                </Form>
              </Col>
            </Row>
          </Container>
        )
      }else if(this.state.selectedOption == 2){
        return(
          <Container className="Wallet">
            <Row>
              <Col sm="12" md={{ size: 8, offset: 2 }}>
                Fund Group
              </Col>
            </Row>
            <Row>
              <Col sm="12">
                <Form onSubmit={this.handleSubmitJoinChannel}>
                  <FormGroup row>
                    <Label for="GroupName" sm={2}>Group: </Label>
                    <Col sm={10}>
                      <Input type="text" disabled name="GroupName" placeholder="Berlin" value={this.state.selectedGroup} />
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Label for="User" sm={2}>User: </Label>
                    <Col sm={10}>
                      <Input type="text" name="User" placeholder="0x123" disabled value={this.state.accounts[0]}/>
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Label for="Amount" sm={2}>DAI Amount: </Label>
                    <Col sm={10}>
                      <Input type="text" name="Amount" placeholder="125" />
                    </Col>
                  </FormGroup>
                  <FormGroup check row>
                    <Col sm={{ size: 12, offset: 0 }}>
                      <Button>Fund</Button>
                    </Col>
                  </FormGroup>
                </Form>
              </Col>
            </Row>
          </Container>
        )
      }

    }

  handleFriendNameChange = (idx) => (evt) => {
    const newFriends = this.state.friends.map((friend, sidx) => {
      if (idx !== sidx) return friend;
      return { ...friend, address: evt.target.value };
    });

    this.setState({ friends: newFriends });
  }

  // handleSubmit = (evt) => {
  //   const { name, friends } = this.state;
  //   alert(`Added: ${name} with ${friends.length} friends`);
  // }

  handleAddFriend = () => {
    this.setState({
      friends: this.state.friends.concat([{ address: '' }])
    });
  }

  handleRemoveFriend = (idx) => () => {
    this.setState({
      friends: this.state.friends.filter((s, sidx) => idx !== sidx)
    });
  }

  renderGroupList(){
    const listItems = this.state.groups.map((group) => {

      const participantsItems = group.friends.map((participant,i) => {

        var participantItem = {
          address: participant.address,
          balance: participant.balance
        }

        return(
          <li key={i}>{participantItem.address} - Balance: {this.state.web3.utils.fromWei(participant.balance,"ether")} DAI
          </li>
        )
      })

      if(group.closed && group.myBal != 0){
        return (<tr>
          <th scope="row">{group.name}</th>
          <td>{participantsItems}</td>
          <td>{group.timeout}</td>
          <td>Group is closed</td>
          <td><Link href="" to={"/expenses/"+group.name}>View Expenses</Link></td>
          <td><Button color="info" size="sm" onClick={() => this.handlePullFundsFromChannel(group.name)}>Pull Funds</Button></td>

        </tr>);
      }else if(group.closed && group.myBal == 0){
        return (<tr>
          <th scope="row">{group.name}</th>
          <td>{participantsItems}</td>
          <td>{group.timeout}</td>
          <td>Group is closed</td>
          <td><Link href="" to={"/expenses/"+group.name}>View Expenses</Link></td>
          <td>Balance pulled</td>

        </tr>);
      }else{
        return (<tr>
          <th scope="row">{group.name}</th>
          <td>{participantsItems}</td>
          <td>{group.timeout}</td>
          <td> <Button color="primary" size="sm" onClick={() => this.handleJoinChannel(group.name)}>Add Balance</Button></td>
          <td><Link href="" to={"/expenses/"+group.name}>Manage Expenses</Link></td>
          <td>
            <div><Button color="danger" size="sm" onClick={() => this.handleCloseChannel(group.name)}>CLOSE</Button></div>
          </td>

        </tr>);
      }

    });

    return (
      <Table>
        <thead>
          <tr>
            <th>Group Name</th>
            <th>Participants</th>
            <th>Timeout</th>
            <th>Balance</th>
            <th>Expenses</th>
            <th>Close Group</th>
          </tr>
        </thead>
        <tbody>
          {listItems}
        </tbody>
      </Table>
    );
  }

    render() {
      return (
        <div className="NewChannel-Container">

          <Button color="primary" size="lg" block onClick={this.handleNewChannel}>Create New Group</Button>
          {/* <Button color="secondary" size="lg" block onClick={this.handleJoinChannel}>Join Existing Channel</Button> */}

          {this.renderSelectedOption()}

          {this.renderGroupList()}
        </div>
      )
    }
  }

  export default Channel;
