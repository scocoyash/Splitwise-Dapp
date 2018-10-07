var SplitETH = artifacts.require("./SplitETH.sol");
var SEToken = artifacts.require("./SEToken.sol");

module.exports = function(deployer) {
  deployer.deploy(SEToken);
  deployer.deploy(SplitETH);
};
