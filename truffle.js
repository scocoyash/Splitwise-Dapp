//require('babel-register');
//require('babel-polyfill');

//const HDWalletProvider = require("truffle-hdwallet-provider-privkey");
// const privKey = require('fs').readFileSync('./privKey').toString();

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 7545,
      network_id: '*', // Match any network id
      gas: 79000000,
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
