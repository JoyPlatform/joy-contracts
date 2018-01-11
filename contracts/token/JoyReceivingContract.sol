pragma solidity ^0.4.11;

import './ERC223ReceivingContract.sol';

 /**
 * @title JoyReceivingContract is a ERC223ReceivingContract class extension for JoyPlatform demands
 * JoyReceivingContract adding new customDeposit that is analogous to tokenFallback function
 */
contract JoyReceivingContract is ERC223ReceivingContract {
    //  customDeposit function analogous to tokenFallback function in ERC223ReceivingContract
    function customDeposit(address _from, uint _value, bytes _data) external;
}
