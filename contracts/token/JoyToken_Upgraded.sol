pragma solidity ^0.4.23;

import './JoyToken.sol';
import './ERC223ReceivingContract.sol';
import './JoyReceivingContract.sol';

/**
 * @title JoyTokenUpgrade
 * @dev ERC20 JoyToken StandarToken with features insipred by ERC223 allowing transfers to the contracts.
 */
contract JoyTokenUpgraded {
    JoyToken token;

    /**
     * @dev JoyTokenERC20 address of the underlying ERC20 JoyToken
     */
    constructor(address JoyTokenERC20) public {
        token = JoyToken(JoyTokenERC20);
    }

    // returns address of underlying erc20 token
    function getUnderlyingTokenAddress() public constant returns (address) {
      return address(token);
    }

    // simple shims for trivial operations
    // ------------------ reimplementation for basic functions ------------------
    function name() public constant returns (string) {
      return token.name();
    }
    function symbol() public constant returns (string) {
      return token.symbol();
    }
    function balanceOf(address _owner) public constant returns (uint256) {
      return token.balanceOf(_owner);
    }
    function decimals() public constant returns (uint8) {
      return token.decimals();
    }
    function totalSupply() public constant returns (uint256) {
      return token.totalSupply();
    }

    // -------------------- features inspired by erc223 idea --------------------

    // Event for ERC223 transfers that contain additional data.
    event ERC223Transfer(address indexed from, address indexed to, uint256 value, bytes data);

    // Special Event for transferToDeposit function.
    event CustomDeposit(address indexed from, address indexed to, uint256 value, bytes data);

    /**
     * ERC223 Reference implementation
     * Function that is called when a user or another contract wants to transfer funds.
     */
    function transfer(address _to, uint256 _value, bytes _data) public returns (bool success) {
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
    function transfer(address _to, uint256 _value) public returns (bool success) {
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
     * This is a ERC20 standard way of token transfering
     * Backward compatible including standard Transfer event
     */
    function transferToAddress(address _to, uint256 _value, bytes _data) private returns (bool success) {
        success = token.transferFrom(msg.sender, _to, _value);
        if (!success) { revert(); }

        emit ERC223Transfer(msg.sender, _to, _value, _data);
     }

    /**
     * @dev Function that is called when transaction target is a contract
     * This is a ERC223 way of transfering tokens to contracts
     * Receiving contract need to implement tokenFallback function, otherwise transfer will be reverted.
     * Thanks to it, tokens will not be lost.
     */
    function transferToContract(address _to, uint256 _value, bytes _data) private returns (bool success) {
        success = token.transferFrom(msg.sender, _to, _value);
        if (!success) { revert(); }

        ERC223ReceivingContract receiver = ERC223ReceivingContract(_to);
        receiver.tokenFallback(msg.sender, _value, _data);
        emit ERC223Transfer(msg.sender, _to, _value, _data);
    }

    /**
     * @dev Custom transfer function for JoyPlatform demands
     * transferToGame is similar to erc223 transferToContract function, but requires different receiver function.
     * This approach allows additional specific behavior for the needs of JoyPlatform
     * transfer is possible only to another contract supporting customDeposit
     **/
    function transferToGame(address _to, uint256 _value, bytes _data) public returns (bool success) {
        require(isContract(_to));

        success = token.transferFrom(msg.sender, _to, _value);
        if (!success) { revert(); }

        JoyReceivingContract receiver = JoyReceivingContract(_to);
        receiver.customDeposit(msg.sender, _value, _data);
        emit CustomDeposit(msg.sender, _to, _value, _data);
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
