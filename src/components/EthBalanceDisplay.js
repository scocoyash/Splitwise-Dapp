import React, { Component } from 'react';

class EthBalanceDisplay extends Component {

  constructor(props) {
    super(props);

      this.state = {
        web3: props.web3,
        web3WH: props.web3WH,
        myBalance:0,
        loading: true
      };
    }

    async componentDidMount(){

      var accounts;
      this.state.web3.eth.getAccounts().then(res => {
        accounts = res;
        this.setState({accounts:accounts});
      })

      this.timerID = setInterval(
        () => this.getEthBalance(),
        1000
      );

    }

    getEthBalance(){
      this.state.web3.eth.getBalance(this.state.accounts[0])
      .then(bal => {
        this.setState({
          myBalance:this.state.web3.utils.fromWei(bal,"Ether"),
          loading:false
        });
      });
    }

    componentWillUnmount() {
      clearInterval(this.timerID);
    }

    renderBalance(){
      if(this.state.loading){
        return (<em>Loading balance...</em>)
      }else{
        return (<em>{this.state.myBalance} ETH</em>)
      }

      //
    }

    render() {
      return (
          this.renderBalance()
      )
    }
  }

  export default EthBalanceDisplay;
