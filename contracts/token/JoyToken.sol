pragma solidity ^0.4.11;

import './StandardToken.sol';
import './ERC223ReceivingContract.sol';

/**
 * @title SimpleToken
 * @dev ERC20 StandarToken with features insipred by ERC223 allowing transfers to the contract.
 * Simple version where all tokens are pre-assigned to the creator.
 * `StandardToken` functions.
 */
contract JoyToken is StandardToken {

  string public constant name = "JoyToken";
  string public constant symbol = "JOY";
  uint8 public constant decimals = 10;

  uint256 public constant INITIAL_SUPPLY = 700000000 * (10 ** uint256(decimals));

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    function JoyToken() public {
        totalSupply = INITIAL_SUPPLY;           // update total supply
        balances[msg.sender] = INITIAL_SUPPLY;  // give the creator all initial tokens
    }

    // -------------------- features inspired by erc223 idea --------------------

    // Event for ERC223 transfers that contain additional data.
    event ERC223Transfer(address indexed from, address indexed to, uint256 value, bytes data);

    /**
     * ERC223 Reference implementation
     * Function that is called when a user or another contract wants to transfer funds.
     */
    function transfer(address _to, uint _value, bytes _data) returns (bool success) {
        if(isContract(_to)) {
            return transferToContract(_to, _value, _data);
        }
        else {
            return transferToAddress(_to, _value, _data);
        }
    }

    /**
     * Standard function transfer similar to ERC20 transfer with no _data .
     * Added due to backwards compatibility reasons.
     */
    function transfer(address _to, uint _value) returns (bool success) {
        bytes memory empty;
        if(isContract(_to)) {
            return transferToContract(_to, _value, empty);
        }
        else {
            return transferToAddress(_to, _value, empty);
        }
    }

    /**
     * @dev Function that is called when transaction target is an address
     * This is a standard ERC20 way of token transfering
     * Backward compatible including standard Transfer event
     */
    function transferToAddress(address _to, uint _value, bytes _data) private returns (bool success) {
        require(_value <= balanceOf(msg.sender));

        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balanceOf(msg.sender).sub(_value);
        balances[_to] = balanceOf(_to).add(_value);
        Transfer(msg.sender, _to, _value);
        ERC223Transfer(msg.sender, _to, _value, _data);
        return true;
     }

    /**
     * @dev Function that is called when transaction target is a contract
     * This is a ERC223 way of transfering tokens to contracts
     * Receiving contract need to implement tokenFallback function, otherwise transfer will be reverted.
     * Thanks to it, tokens will not be lost.
     */
    function transferToContract(address _to, uint _value, bytes _data) private returns (bool success) {
        require(_value <= balanceOf(msg.sender));

        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balanceOf(msg.sender).sub(_value);
        balances[_to] = balanceOf(_to).add(_value);

        ERC223ReceivingContract receiver = ERC223ReceivingContract(_to);
        receiver.tokenFallback(msg.sender, _value, _data);
        Transfer(msg.sender, _to, _value);
        ERC223Transfer(msg.sender, _to, _value, _data);
        return true;
    }

    /**
     * @dev Helper function. Checking if given address is a contract
     *
     * Check is made by assemby size of bytecode that can be executed on given eth address, only contracts have it
     * _addr any eth valid address
     */
    function isContract(address _addr) private constant returns (bool) {
        uint codeLength;
        assembly {
            // Retrieve the size of the code on target address, this needs assembly .
            codeLength := extcodesize(_addr)
        }
        return (codeLength > 0);
    }
}
