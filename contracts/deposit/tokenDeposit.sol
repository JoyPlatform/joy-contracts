pragma solidity ^0.4.11;

import '../math/SafeMath.sol';
import '../token/MultiContractAsset.sol';
import '../token/ERC223ReceivingContract.sol';

contract tokenDeposit is ERC223ReceivingContract {
    using SafeMath for uint;

    MultiContractAsset m_supportedToken;

    mapping(address => uint256) deposits;

    // debug
    address public dbg_tokenAddr;
    address public dbg_senderAddr;
    // debug

    /**
     * @dev Constructor
     * @param _supportedToken The address of token contract that will be supported as players deposit
     */
    function tokenDeposit(address _supportedToken) {
        m_supportedToken = MultiContractAsset(_supportedToken);
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param _playerAddr The address to query the the balance of.
     * @return An uint256 representing the amount owned by the passed address.
     */
    function balanceOfPlayer(address _playerAddr) public constant returns (uint256) {
        return deposits[_playerAddr];
    }

    /**
     * @dev Function that receive tokens, throw exception if tokens is not supported.
     * This contract could recieve tokens, using functionalities designed in erc223 standard.
     * !! works only with tokend designed in erc223 way.
     */
    function onTokenReceived(address _from, uint _value, bytes _data) public {
        // msg.sender is a token-contract address here
        // we will use this information to filter what token we accept as deposit
        dbg_tokenAddr = address(m_supportedToken);
        dbg_senderAddr = msg.sender;

        // get address of supported token
        require(msg.sender == address(m_supportedToken));
        //TODO make sure about other needed requirements!

        deposits[_from] = deposits[_from].add(_value);
        OnTokenReceived(_from, _value, _data);
    }

    /**
     * @dev Function that could be executed by players to withdraw thier deposit
     */
    function payOut(address _to, uint256 _value) {
        // use transfer function from supported token.
        // should be used from player address that was registred in deposits
        require(_value <= deposits[msg.sender]);
        // consider revert function

        deposits[msg.sender] = deposits[msg.sender].sub(_value);

        m_supportedToken.transfer(_to, _value);
    }
}

