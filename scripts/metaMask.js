function signMsg() {

//  {"amounts":[15,5,20],"isCredits":[false,false,true],"timestamp":1,"name":"ETHBerlin","contract":"0xcf943c666c7e5619d3a26099732d7caf64594c95"}


  let msgParams = [
    {type: 'address', name: 'splitETH', value: '0xcf943c666c7e5619d3a26099732d7caf64594c95'},
    {type: 'bytes32', name: 'name', value: "ETHBerlin"},
    {type: 'uint256', name: 'timestamp', value: 1},
    {type: 'uint256', name: 'amount_0', value: 15},
    {type: 'bool', name: 'isCredit_0', value: false},
    {type: 'uint256', name: 'amount_1', value: 5},
    {type: 'bool', name: 'isCredit_1', value: false},
    {type: 'uint256', name: 'amount_2', value: 20},
    {type: 'bool', name: 'isCredit_2', value: true},
  ];

  let from = "0xb4d282d27ac377519e80982cfff8927eb2adf440";

  web3.currentProvider.sendAsync({
    method: 'eth_signTypedData',
    params: [msgParams, from],
    from: from,
  }, function (err, result) {
    if (err) return console.error(err)
    if (result.error) {
      return console.error(result.error.message)
    }
    let res = result.result.slice(2);
    let r = '0x' + res.substr(0, 64),
      s = '0x' + res.substr(64, 64),
      v = parseInt(res.substr(128, 2), 16);
    console.log(v, r, s);
  });

}

signMsg();
