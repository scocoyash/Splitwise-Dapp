pragma solidity ^0.4.24;
/* pragma experimental ABIEncoderV2; */

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ECRecovery.sol";

contract SplitETH {
    using SafeMath for uint256;

    struct State {
        uint256 amount;
        bool isCredit;
    }

    mapping (bytes32 => mapping (address => uint256)) public groupBalances;
    mapping (bytes32 => mapping (address => bool)) public inGroup;
    mapping (bytes32 => address[]) public groupUsers;
    mapping (bytes32 => address) public groupToken;
    mapping (bytes32 => uint256) public groupTimeout;
    mapping (bytes32 => uint256) public groupCloseTime;
    mapping (bytes32 => uint256) public groupNonce;
    mapping (bytes32 => mapping (address => State)) public groupState;

    event GroupCreated(bytes32 indexed _name, address[] _users, address indexed _token, uint256 _timeout);
    event UserBalanceUpdated(bytes32 indexed _name, address indexed _user, address indexed _token, uint256 _deposit, uint256 _balance);
    event GroupClosed(bytes32 indexed _name, uint256 _challengeEndTime);
    event GroupUpdated(bytes32 indexed _name, uint256 _time);
    event UserBalanceWithdrawn(bytes32 indexed _name, address indexed _user, address indexed _token, uint256 _refund);

    function createGroup(bytes32 _name, address[] _users, address _token, uint256 _timeout) external {
        require(_users.length > 1, "Empty group");
        require(_users.length <= 4, "Group too large");
        require(groupUsers[_name].length == 0, "Name in use");
        require(_token != address(0), "Invalid token");
        groupUsers[_name] = _users;
        groupToken[_name] = _token;
        groupTimeout[_name] = _timeout;
        for (uint8 i = 0; i < _users.length; i++) {
            require(!inGroup[_name][_users[i]], "Duplicate users");
            inGroup[_name][_users[i]] = true;
        }
        emit GroupCreated(_name, _users, _token, _timeout);
    }

    function fundUser(bytes32 _name, address _user, uint256 _amount) external {
        require(_user != address(0), "Invalid user");
        require(inGroup[_name][_user], "User not in group");
        require(groupCloseTime[_name] == 0, "Group is closed");
        require(ERC20(groupToken[_name]).transferFrom(msg.sender, address(this), _amount), "Transfer Failed");
        groupBalances[_name][_user] = groupBalances[_name][_user].add(_amount);
        emit UserBalanceUpdated(_name, _user, groupToken[_name], _amount, groupBalances[_name][_user]);
    }

    function closeGroup(bytes32 _name, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp, uint8[] _vs, bytes32[] _rs, bytes32[] _ss) external {
        require(groupCloseTime[_name] == 0, "Group already closed");
        groupCloseTime[_name] = now.add(groupTimeout[_name]);
        updateGroup(_name, _amounts, _isCredits, _timestamp, _vs, _rs, _ss);
        emit GroupClosed(_name, groupCloseTime[_name]);
    }

    function updateGroup(bytes32 _name, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp, uint8[] _vs, bytes32[] _rs, bytes32[] _ss) public {
        require(inGroup[_name][msg.sender], "User is not in group");
        require(groupNonce[_name] < _timestamp);
        require(groupCloseTime[_name] != 0, "Group not closed");
        require(_amounts.length == _isCredits.length, "Invalid state lengths");
        require(_amounts.length == groupUsers[_name].length, "Invalid user lengths");
        require(now <= groupCloseTime[_name], "Challenge period not active");
        require(checkSigs(_name, _amounts, _isCredits, _timestamp, _vs, _rs, _ss), "Invalid sigs");
        require(_updateState(_name, _amounts, _isCredits, _timestamp), "Invalid state");
        emit GroupUpdated(_name, now);
    }

    function pullFunds(bytes32 _name) external {
        require(inGroup[_name][msg.sender], "User is not in group");
        require(groupCloseTime[_name] != 0, "Close not initiated");
        require(now > groupCloseTime[_name], "Challenge period active");
        State memory userState = groupState[_name][msg.sender];
        uint256 withdrawn;
        if (userState.isCredit) {
            withdrawn = groupBalances[_name][msg.sender].add(userState.amount);
        } else {
            withdrawn = groupBalances[_name][msg.sender].sub(userState.amount);
        }
        require(ERC20(groupToken[_name]).transfer(msg.sender, withdrawn), "Transfer Failed");
        emit UserBalanceWithdrawn(_name, msg.sender, groupToken[_name], withdrawn);
        groupBalances[_name][msg.sender] = 0;
        inGroup[_name][msg.sender] = false;
    }

    function _updateState(bytes32 _name, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp) internal returns(bool) {
        uint256 credits;
        uint256 debits;
        for (uint8 i = 0; i < _amounts.length; i++) {
            if (_isCredits[i]) {
                credits = credits.add(_amounts[i]);
            } else {
                debits = debits.add(_amounts[i]);
            }
            groupState[_name][groupUsers[_name][i]] = State(_amounts[i], _isCredits[i]);
        }
        require(credits == debits, "Non-zero state");
        groupNonce[_name] = _timestamp;
        return true;
    }

    function checkSigs(bytes32 _name, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp, uint8[] _vs, bytes32[] _rs, bytes32[] _ss) public view returns(bool) {
        require(_vs.length == _rs.length, "Bad signatures");
        require(_vs.length == _ss.length, "Bad signatures");
        require(_vs.length == groupUsers[_name].length, "Incorrect sigs length");
        require(_vs.length == _amounts.length, "Incorrect amounts length");
        for (uint8 i = 0; i < groupUsers[_name].length; i++) {
            require(checkSig(_name, groupUsers[_name][i], _amounts, _isCredits, _timestamp, _vs[i], _rs[i], _ss[i]), "Invalid signature");
        }
        return true;
    }

    function checkSig(bytes32 _name, address _user, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp, uint8 _v, bytes32 _r, bytes32 _s) public view returns(bool) {
        require(_amounts.length == _isCredits.length, "Incorrect isCredits length");
        bytes32 typedData;
        if (_amounts.length == 2) {
            typedData = _getHash2(_name, _amounts, _isCredits, _timestamp);
        }
        if (_amounts.length == 3) {
            typedData = _getHash3(_name, _amounts, _isCredits, _timestamp);
        }
        if (_amounts.length == 4) {
            typedData = _getHash4(_name, _amounts, _isCredits, _timestamp);
        }
        require(_user == ecrecover(typedData, _v, _r, _s), "Signature mismatch");
        return true;
    }

    function _getHash2(bytes32 _name, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp) internal view returns(bytes32) {
        bytes32 stateData = keccak256(abi.encodePacked(address(this), _name, _timestamp, _amounts[0], _isCredits[0], _amounts[1], _isCredits[1]));
        bytes32 abiHash = keccak256(abi.encodePacked("address splitETH", "bytes32 name", "uint256 timestamp", "uint256 amount_0", "bool isCredit_0", "uint256 amount_1", "bool isCredit_1"));
        bytes32 typedData = keccak256(abi.encodePacked(abiHash, stateData));
        return typedData;
    }

    function _getHash3(bytes32 _name, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp) internal view returns(bytes32) {
        bytes32 stateData = keccak256(abi.encodePacked(address(this), _name, _timestamp, _amounts[0], _isCredits[0], _amounts[1], _isCredits[1], _amounts[2], _isCredits[2]));
        bytes32 abiHash = keccak256(abi.encodePacked("address splitETH", "bytes32 name", "uint256 timestamp", "uint256 amount_0", "bool isCredit_0", "uint256 amount_1", "bool isCredit_1", "uint256 amount_2", "bool isCredit_2"));
        bytes32 typedData = keccak256(abi.encodePacked(abiHash, stateData));
        return typedData;
    }

    function _getHash4(bytes32 _name, uint256[] _amounts, bool[] _isCredits, uint256 _timestamp) internal view returns(bytes32) {
        bytes32 stateData = keccak256(abi.encodePacked(address(this), _name, _timestamp, _amounts[0], _isCredits[0], _amounts[1], _isCredits[1], _amounts[2], _isCredits[2], _amounts[3], _isCredits[3]));
        bytes32 abiHash = keccak256(abi.encodePacked("address splitETH", "bytes32 name", "uint256 timestamp", "uint256 amount_0", "bool isCredit_0", "uint256 amount_1", "bool isCredit_1", "uint256 amount_2", "bool isCredit_2", "uint256 amount_3", "bool isCredit_3"));
        bytes32 typedData = keccak256(abi.encodePacked(abiHash, stateData));
        return typedData;
    }

}
