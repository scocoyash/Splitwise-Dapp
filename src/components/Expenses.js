import React, { Component } from 'react';
import SplitETHJSON from '../build/contracts/SplitETH.json'
import { NETWORK_ID } from './Channel';
import BigNumber from 'bignumber.js';
import { Button, FormGroup, Input, Col } from 'reactstrap';
import $ from 'jquery';

export const API_HOST = 'http://localhost:3001';

export const cleanAsciiText = text => text && text.replace(/[\x00-\x09\x0b-\x1F]/g, '').trim();

export const toWei = (token) => new BigNumber(token).multipliedBy((new BigNumber(10)).pow(18));

const printNumber = (number) => {
  if (BigNumber.isBigNumber(number)) {
    // const fixedNumber = number.div((new BigNumber(10)).pow(18)).toFixed();
    const fixedNumber = number.toFixed();

    if (fixedNumber.indexOf('-') === 0) {
      return `-$${fixedNumber.slice(1, fixedNumber.length)}`;
    }

    return `$${fixedNumber}`;
  }

  return `$${number}`;
}

const getAddressName = (address, showAddress = true) => {
  address = address.toLowerCase();
  const savedEntry = window.localStorage.getItem(address);

  if (savedEntry) {
    return <span><b>{savedEntry}</b>{showAddress && ` (${address.slice(0, 6)}...${address.slice(address.length - 3, address.length)})`}</span>;
  }

  return address;
}

class Expenses extends Component {

  constructor(props) {
    super(props);

    this.handleSubmit = this.handleSubmit.bind(this);
    this.addBill = this.addBill.bind(this);
    this.submitNewBill = this.submitNewBill.bind(this);
    this.handleNewBillMemberChange = this.handleNewBillMemberChange.bind(this);
    this.handleNewBillChange = this.handleNewBillChange.bind(this);

      this.state = {
        web3: props.web3,
        web3WH: props.web3WH,
        accounts:"",
        channelID:this.props.match.params.channelID,
        expenses:[]
      };

      var accounts;
      this.state.web3.eth.getAccounts().then(res => {
        accounts = res;
        this.setState({accounts:accounts});
      });
    }

    async handleSubmit(event) {

      let amount = this.state.web3.utils.toWei(event.target.Amount.value,"Ether")
      let to = event.target.To.value
      event.preventDefault();
      event.target.reset();
      this.state.web3.eth.sendTransaction({
          from: this.state.accounts[0],
          to: to,
          value: amount
      })
      .then(function(){
          alert("Transaction successfully completed!");
      });
    }

    async componentDidMount(){
      console.log("ELID",this.state.channelID);
      await this.getExpenses();

      await this.setupContracts();

      const group = await this.getGroupById(this.state.channelID);

      console.log('setstate', group);

      this.setState({
        group
      });
    }

    async setupContracts() {
      const props = this.props;

      const splitETHAddress = SplitETHJSON.networks[NETWORK_ID].address;
      const splitETHABI = SplitETHJSON.abi;

      const splitETH = new props.web3.eth.Contract(splitETHABI,splitETHAddress);
      const splitETH_event = new props.web3WH.eth.Contract(splitETHABI,splitETHAddress);
      splitETH_event.setProvider(props.web3WH.currentProvider);

      const accounts = await this.props.web3.eth.getAccounts();

      this.setState({
        accounts,
        splitETH,
        splitETH_event
      });
    }

    async getGroupById(name) {
      return new Promise(resolve => {
        var _this = this;
        this.state.splitETH_event.getPastEvents('GroupCreated', {
            fromBlock: 0,
            toBlock: 'latest'
        }, function(){})
        .then(async function(events){
          const groups = [];

          for (let element of events) {
            var friends = [];
            for (let usr of element.returnValues._users) {
              const result = await _this.state.splitETH.methods.groupBalances(element.returnValues._name,usr).call();

              friends.push({
                address:usr,
                balance:result
              })
            }

            groups.push({
                name: cleanAsciiText(_this.state.web3.utils.toAscii(element.returnValues._name)),
                friends: friends,
                timeout: element.returnValues._timeout
            });
          }

          console.log('groups', groups, 'name', name, name === groups[0].name, groups.find(group => group.name === name));

          resolve(groups.find(group => group.name === name));
        });
      })

    }

    render() {
      let { bills, channelID, group, newBill } = this.state;

      console.log('group', group);

      if (bills && group) {
        bills = bills.map(bill => {
          bill.detailed = [];

          const addresses = {};

          bill.parts.map(part => {
            addresses[part.address.toLowerCase()] = {
              spent: part.value,
              paid: 0
            }
          });

          bill.payments.map(payment => {
            addresses[payment.address.toLowerCase()].paid = payment.value;
          });

          console.debug('aar', {
            addresses,
            friends: group.friends
          });
          group.friends.map(entry => {
            const tokensAmount = (new BigNumber(entry.balance)).div((new BigNumber(10).pow(18)));

            addresses[entry.address.toLowerCase()].balance = tokensAmount
          });

          bill.totalBalanceChange.map(entry => {
            // const tokensAmount = (new BigNumber(entry.value)).div((new BigNumber(10).pow(18)));
            addresses[entry.address.toLowerCase()].balance = addresses[entry.address.toLowerCase()].balance.plus(new BigNumber(entry.value));
          });

          for (let key of Object.keys(addresses)) {
            bill.detailed.push({
              address: key,
              spent: addresses[key].spent,
              paid: addresses[key].paid,
              balance: addresses[key].balance
            });
          }

          bill.isSignable = !bill.fullySigned && !bill.signatures.find(signature =>
            signature.signer.toLowerCase() === this.state.accounts[0].toLowerCase()
          );

          return bill;
        });
      }


      console.log('bills', bills);
      console.log('group', group);



      return (
        <div className="mt-5">
          <h3>Bills from: {channelID}</h3>
          <div className="mt-5">
            {bills && bills.map((bill, index) => (
              <div className="Bill">
                <div className="Bill-name">
                  <h5>#{index + 1}. Name: {bill.name}</h5>
                  <br/>
                  Total amount paid: {printNumber(bill.totalAmount)}
                  <br/>
                  <table className="table mt-2">
                        <thead>
                        <tr>

                          <th>Member</th>
                          <th>Spent</th>
                          <th>Paid</th>
                          <th>Balance</th>
                        </tr>

                        </thead>
                        <tbody>
                  {bill.detailed && bill.detailed.map(entry => (
                    <tr>
                      <td>{getAddressName(entry.address)}</td>
                      <td>{printNumber(entry.spent)}</td>
                      <td>{printNumber(entry.paid)}</td>
                      <td>{printNumber(entry.balance)}</td>
                    </tr>
                  ))}
                    </tbody>
                  </table>
                  <br/>
                  <br/>
                  Signed by:&nbsp;
                  {bill.signatures.map((signature, index) => (
                    <span>
                      {getAddressName(signature.signer, false)}{index + 1 !== bill.signatures.length ? ',' : ''}&nbsp;
                    </span>
                  ))}
                  <br/>
                  {bill.isSignable && <button className="btn btn-primary mt-3" onClick={() => this.signMsg(bill)}>Sign</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right" style={{ maxWidth: '90%' }}>
            <button className="btn btn-primary" onClick={this.addBill}>Add</button>
          </div>
          {this.state.addingBill && <div className="Bill mt-4">
            <FormGroup row>
              <Col sm={12}>
                <Input
                  type="text"
                  placeholder={`Name of the expense`}
                  value={newBill.name}
                  onChange={this.handleNewBillChange('name')}
                />
              </Col>
            </FormGroup>
            <FormGroup row>
              <Col sm={12}>
                <Input
                  type="text"
                  placeholder={`Total amount paid`}
                  value={newBill.totalAmount}
                  onChange={this.handleNewBillChange('totalAmount')}
                />
              </Col>
            </FormGroup>


                  <table className="table mt-2">
                        <thead>
                          <tr>
                          <th>Member</th>
                          <th>Spent</th>
                          <th>Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                        {group && group.friends && group.friends.map((friend, index) => (
                    <tr>
                      <td>{getAddressName(friend.address)}</td>
                      <td>
                      <Input
                        type="text"
                        placeholder={`Spent`}
                        value={newBill.parts[index].value}
                        onChange={this.handleNewBillMemberChange(index, 'parts')}
                      />
                      </td>
                      <td>
                      <Input
                        type="text"
                        placeholder={`Paid`}
                        value={newBill.payments[index].value}
                        onChange={this.handleNewBillMemberChange(index, 'payments')}
                      />
                      </td>
                    </tr>
                    ))}
                    </tbody>
                  </table>
                  <Button type="button" onClick={this.submitNewBill} className="small">Submit</Button>

          </div>

        }
          <br/>
        </div>
      )
    }

    addBill() {
      const newBill = {
        parts: [],
        payments: [],
        balanceChange: [],
        totalBalanceChange: []
      };

      const previousBill = this.state.bills[this.state.bills.length - 1];

      console.debug({
        previousBill
      });

      if (previousBill) {
        newBill.startingTokenBalanceChange = previousBill.totalBalanceChange.map(entry => ({
          address: entry.address,
          value: entry.value
        }));

        newBill.totalBalanceChange = previousBill.totalBalanceChange.map(entry => ({
          address: entry.address,
          value: entry.value
        }));
      } else {
        newBill.startingTokenBalanceChange = [];
      }

      this.state.group.friends.map(friend => {
        newBill.parts.push({
          address: friend.address,
          value: 0
        });

        newBill.payments.push({
          address: friend.address,
          value: 0
        });

        newBill.balanceChange.push({
          address: friend.address,
          value: 0
        });

        if (!previousBill) {
          newBill.totalBalanceChange.push({
            address: friend.address,
            value: 0
          });

          newBill.startingTokenBalanceChange.push({
            address: friend.address,
            value: 0
          });
        }
      });

      this.setState({
        addingBill: true,
        newBill
      });
    }

    submitNewBill() {
      const groupId = this.state.channelID;

      $.post(`${API_HOST}/group/${groupId}/bill`, this.state.newBill, (data) => {
        console.debug('data callback hit', data);

        this.setState({
          addingBill: false,
          newBill: null
        });

        this.getExpenses();
      });
    }

    handleNewBillMemberChange = (idx, property) => (evt) => {
      const newBill = this.state.newBill;
      newBill[property][idx].value = evt.target.value;

      window.bn = BigNumber;

      newBill.balanceChange[idx].value = (new BigNumber(newBill.payments[idx].value)).minus((new BigNumber(newBill.parts[idx].value))).toFixed();

      console.debug('calc', {
        previousTBC: newBill.totalBalanceChange[idx].value,
        BC: newBill.balanceChange[idx].value
      });
      newBill.totalBalanceChange[idx].value = (new BigNumber(newBill.startingTokenBalanceChange[idx].value)).plus((new BigNumber(newBill.balanceChange[idx].value))).toFixed();


      this.setState(newBill);
    }

    handleNewBillChange = (property) => (evt) => {
      const newBill = this.state.newBill;

      newBill[property] = evt.target.value;

      this.setState(newBill);
    }

    async getExpenses() {
      return new Promise(resolve => {
        $.get(`${API_HOST}/group/${this.state.channelID}/bills`, (data) => {
          console.log('data', data);
          this.setState({
            bills: data
          });
          resolve(data);
        });
      });
    }


    signMsg(bill) {
      let msgParams = [
        {type: 'address', name: 'splitETH', value: this.state.splitETH._address},
        {type: 'bytes32', name: 'name', value: this.state.channelID},
        {type: 'uint256', name: 'timestamp', value: bill.timestamp},
        // {type: 'uint256', name: 'amount_0', value: 100},
        // {type: 'bool', name: 'isCredit_0', value: false},
        // {type: 'uint256', name: 'amount_1', value: 150},
        // {type: 'bool', name: 'isCredit_1', value: false},
        // {type: 'uint256', name: 'amount_2', value: 250},
        // {type: 'bool', name: 'isCredit_2', value: true},
      ];

      bill.totalBalanceChange.map((entry, index) => {
        const sign = parseInt(entry.value) >= 0;
        const wei = toWei(entry.value).toString();

        console.debug("!!", {
          sign,
          wei
        });

        msgParams.push({
          type: 'uint256',
          name: `amount_${index}`,
          value: wei
        });
        msgParams.push({
          type: 'bool',
          name: `isCredit_${index}`,
          value: sign
        });
      });

      console.debug({
        msgParams
      });

      let from = this.state.accounts[0];

      this.state.web3.currentProvider.sendAsync({
        method: 'eth_signTypedData',
        params: [msgParams, from],
        from: from,
      }, (err, result) => {
        if (err) return console.error(err)
        if (result.error) {
          return console.error(result.error.message)
        }
        let res = result.result.slice(2);
        let r = '0x' + res.substr(0, 64),
          s = '0x' + res.substr(64, 64),
          v = parseInt(res.substr(128, 2), 16);
        console.log(v, r, s);

        this.submitSignature(bill, {
          signer: from.toLowerCase(),
          v,
          r,
          s
        });
      });
    }

    submitSignature(bill, signature) {
      const groupId = this.state.channelID;

      $.post(`${API_HOST}/group/${groupId}/bills/${bill._id}/add-signature`, { signature }, (data) => {
        console.debug('submit signature data callback hit', data);

        this.getExpenses();
      });
    }
}

export default Expenses;
