pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

/**
 * @title SimpleToken
 * @dev JoyToken original ERC20 StandarToken.
 * Simple version where all tokens are pre-assigned to the creator.
 * `StandardToken` functions.
 */
contract JoyToken is StandardToken {
    string public constant name = "JoyToken";
    string public constant symbol = "JOY";
    uint8 public constant decimals = 18;

    uint256 public constant INITIAL_SUPPLY = 700000000 * (10 ** uint256(decimals));

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor() public {
        totalSupply_ = INITIAL_SUPPLY;           // update total supply
        balances[msg.sender] = INITIAL_SUPPLY;  // give the creator all initial tokens
    }
}
