pragma solidity ^0.4.11;

import '../math/SafeMath.sol';
import '../token/MultiContractAsset.sol';
import '../token/ERC223ReceivingContract.sol';
import '../ownership/Ownable.sol';


contract tokenDeposit is ERC223ReceivingContract, Ownable {
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
     * !! works only with tokens designed in erc223 way.
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
     * @dev Temporarily transfer funds to the game contract
     *
     * This method can be used only by the owner of this contract.
     * That contruct allow to adding new games without modyfing this contract.
     * Important security check is that will work only if the owner of the game
     * will be same as the owner of this contract
     *
     * @param _playerAddr address of registred player
     * @param _gameContractAddress address to the game contract
     * @param _value amount of Tokens that will be transfered
     * @param _data additionl data
     */
    function transferToGame(address _playerAddr, address _gameContractAddress, uint _value, bytes _data) onlyOwner {
        // check if player have requested _value in his deposit
        require(_value <= deposit[_playerAddr]);

        // _gameContractAddress should be a contract, throw exception if owner will tries to transfer flunds to the individual address.
        // Require supported Token to have 'isContract' method.
        require(m_supportedToken.isContract(_gameContractAddress));

        // Create local joyGame object using address of given gameContract.
        joyGameAbstract joyGame = joyGameAbstract(_gameContractAddress);

        // Require this contract and gameContract to be ownerd by the same address.
        // This check prevents interaction with this contract from externals contracts
        require(joyGame.owner == this.owner);

        deposits[_playerAddr] = deposits[_playerAddr].sub(_value);

        // increase gameContract deposit for the time of the game
        // this funds are locked, and even can not be withdraw by owner
        deposits[_to] = deposits[_to].add(_value);


        bytes memory _empty_data;
        joyGame.onTokenReceived(msg.sender, _value, _empty_data);

        // Event
        OnTokenReceived(, _value, _empty_data);
    }

    /**
     * @dev Function that could be executed by players to withdraw thier deposit
     */
    function payOut(address _to, uint256 _value) {
        // use transfer function from supported token.
        // should be used from player address that was registred in deposits
        require(_value <= deposits[msg.sender]);

        /**
         * Prevents payOut to the contract address.
         * This trick deprives owner incentives to steal Tokens from players.
         * Even if owner use 'transferToGame' method to transfer some deposits to the fake contract,
         * he will not be able to withdraw Tokens to any private address.
         */
        require(isContract(_to) == 0);

        deposits[msg.sender] = deposits[msg.sender].sub(_value);

        // Use m_supportedToken metheod to transfer real Tokens.
        m_supportedToken.transfer(_to, _value);
    }
}

