const BigNumber = require('bignumber.js');
BigNumber.config({ ERRORS: false });
const SplitETH = artifacts.require("./SplitETH.sol");
const SEToken = artifacts.require("./SEToken.sol");
const utils = require('ethereumjs-util');
const sigUtil = require('eth-sig-util');
const assertFail = require("./helpers/assertFail");
const increaseTime = require('./helpers/time');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545")) // Hardcoded development port

const pk1 = "177573a4f495ba272b50f58d9b4873c20196056c31ef205f184f74615135142e";
const pk2 = "b363afae0466959e57931f61f3a3446834dc2deaa3e0bd24a9f75194fb3c03b5";
const pk3 = "88292f620445415b03c2125c368999a80c3eeeabaa985da9835ce959e6d2a606";

contract('SplitETH', function (accounts) {

    const ALICE = accounts[1];
    const BOB = accounts[2];
    const CHARLES = accounts[3];
    const DAVE = accounts[4];

    it("1. create ETHBerlin state channel with three participants", async () => {
        const splitETH = await SplitETH.deployed();
        const token = await SEToken.deployed();
        await splitETH.createGroup("ETHBerlin", [ALICE, BOB, CHARLES], token.address, 0);//7 * 24 * 60 * 60);
    });

    it("2. Alice funds the state channel with 1000 tokens", async () => {
        const splitETH = await SplitETH.deployed();
        const token = await SEToken.deployed();
        await token.getTokens(ALICE, 1000);
        await token.approve(splitETH.address, 1000, {from: ALICE});
        await splitETH.fundUser("ETHBerlin", ALICE, 1000, {from: ALICE});
    });

    it("3. Bob funds the state channel with 500 tokens", async () => {
        const splitETH = await SplitETH.deployed();
        const token = await SEToken.deployed();
        await token.getTokens(BOB, 500);
        await token.approve(splitETH.address, 500, {from: BOB});
        await splitETH.fundUser("ETHBerlin", BOB, 500, {from: BOB});
    });

    it("4. Charles funds the state channel with 300 tokens", async () => {
        const splitETH = await SplitETH.deployed();
        const token = await SEToken.deployed();
        await token.getTokens(CHARLES, 300);
        await token.approve(splitETH.address, 300, {from: CHARLES});
        await splitETH.fundUser("ETHBerlin", CHARLES, 300, {from: CHARLES});
    });

    it("5. Close ETHBerlin state channel with updated state", async () => {
        const splitETH = await SplitETH.deployed();
        const token = await SEToken.deployed();
        let state = {amounts: [15, 5, 20], isCredits: [false, false, true], timestamp: 1, name: "ETHBerlin", contract: splitETH.address};
        console.log(JSON.stringify(state));
        let vs = [];
        let rs = [];
        let ss = [];
        let res1 = signState(state, pk1);
        vs.push(res1.v);
        rs.push(res1.r);
        ss.push(res1.s);
        let res2 = signState(state, pk2);
        vs.push(res2.v);
        rs.push(res2.r);
        ss.push(res2.s);
        let res3 = signState(state, pk3);
        vs.push(res3.v);
        rs.push(res3.r);
        ss.push(res3.s);
        await splitETH.closeGroup("ETHBerlin", state.amounts, state.isCredits, state.timestamp, vs, rs, ss, {from: ALICE});
    });

    it("6. Pull funds", async () => {
        const splitETH = await SplitETH.deployed();
        const token = await SEToken.deployed();
        await increaseTime(50);
        await splitETH.pullFunds("ETHBerlin", {from: ALICE});
        await splitETH.pullFunds("ETHBerlin", {from: BOB});
        await splitETH.pullFunds("ETHBerlin", {from: CHARLES});
    });

});

const signState = (state, pk) => {

  let typedData = [
    {type: 'address', name: 'splitETH', value: state.contract},
    {type: 'bytes32', name: 'name', value: state.name},
    {type: 'uint256', name: 'timestamp', value: state.timestamp}
  ];

  for (let i = 0; i < state.amounts.length; i++) {
      typedData.push({type: 'uint256', name: 'amount_' + i, value: state.amounts[i]});
      typedData.push({type: 'bool', name: 'isCredit_' + i, value: state.isCredits[i]});
  }

  const msgParams = { data: typedData };
  const privKey = new Buffer(pk, 'hex')

  const sig = sigUtil.signTypedData(privKey, msgParams);
  console.log("SIG: " + sig);

  let res = sig.slice(2);
  let r = '0x' + res.substr(0, 64),
    s = '0x' + res.substr(64, 64),
    v = parseInt(res.substr(128, 2), 16);

  const result = { v, r, s };
  return result;
}
