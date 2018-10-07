import React, { Component } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Button, Form, FormGroup, Label, Input, FormText } from 'reactstrap';


import EthBalanceDisplay from './EthBalanceDisplay'

class Wallet extends Component {

  constructor(props) {
    super(props);

    this.handleSubmit = this.handleSubmit.bind(this);

      this.state = {
        web3: props.web3,
        web3WH: props.web3WH,
        accounts:""
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
      .then(function(receipt){
          alert("Transaction successfully completed!");
      });
    }


    render() {
      return (
        <div>
          <Container className="Wallet">
            <Row>
              <Col sm="12" md={{ size: 8, offset: 2 }}>
                {this.state.accounts[0]} (<EthBalanceDisplay web3={this.state.web3} web3WH={this.state.web3WH} />)
              </Col>
            </Row>
            <Row>
              <Col sm="12" md={{ size: 8, offset: 2 }}>
                Transfer funds
              </Col>
            </Row>
            <Row>
              <Col sm="12">
                <Form onSubmit={this.handleSubmit}>
                  <FormGroup row>
                    <Label for="To" sm={2}>To: </Label>
                    <Col sm={10}>
                      <Input type="text" name="To" placeholder="0x0123..." />
                    </Col>
                  </FormGroup>
                  <FormGroup row>
                    <Label for="Amount" sm={2}>Amount: </Label>
                    <Col sm={10}>
                      <Input type="text" name="Amount" placeholder="1.5" />
                    </Col>
                  </FormGroup>
                  <FormGroup check row>
                    <Col sm={{ size: 12, offset: 0 }}>
                      <Button>Transfer</Button>
                    </Col>
                  </FormGroup>
                </Form>
              </Col>
            </Row>
          </Container>
        </div>
      )
    }
}

export default Wallet;
