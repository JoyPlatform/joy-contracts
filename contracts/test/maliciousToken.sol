pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

import '../token/ERC223ReceivingContract.sol';

/**
 * Token with erc223 transferToContract, unsuported by platformDeposit used only in tests
 */
contract MaliciousToken is BasicToken {
    using SafeMath for uint256;

    string public constant name = "MaliciousToken";
    uint8 public constant decimals = 8;

    uint256 public constant INITIAL_SUPPLY = 21000000 * (10 ** uint256(decimals));

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor() public {
        totalSupply_ = INITIAL_SUPPLY;           // update total supply
        balances[msg.sender] = INITIAL_SUPPLY;  // give the creator all initial tokens
    }

    // function that is called when transaction target is a contract
    function transferToContract(address _to, uint _value) public returns (bool success) {
        BasicToken.transfer(_to, _value);

        bytes memory empty;
        ERC223ReceivingContract receiver = ERC223ReceivingContract(_to);
        receiver.tokenFallback(msg.sender, _value, empty);

        return true;
    }
}
