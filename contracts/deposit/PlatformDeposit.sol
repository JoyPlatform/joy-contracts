pragma solidity ^0.4.11;

import '../math/SafeMath.sol';
import '../token/MultiContractAsset.sol';
import '../token/ERC223ReceivingContract.sol';
import '../ownership/Ownable.sol';
import '../game/JoyGameAbstract.sol';

/**
 * Main token deposit contract.
 *
 * In demo version only playing in on game at the same time is allowed,
 * so locks, unlocks, and transfer function operate on all player deposit.
 */
contract PlatformDeposit is ERC223ReceivingContract, Ownable {
    using SafeMath for uint;

    MultiContractAsset m_supportedToken;

    mapping(address => uint256) deposits;
    mapping(address => uint256) lockedFunds;

    /**
     * platformReserve - Main platform address and reserve for winnings
     * Important address that collecting part of players losses as reserve which players will get thier winnings.
     * For security reasons "platform reserve address" needs to be separated/other that address of owner of this contract.
     */
    address platformReserve;

    /**
     * @dev Constructor
     * @param _supportedToken The address of token contract that will be supported as players deposit
     */
    function PlatformDeposit(address _supportedToken, address _platformReserve) {
        // owner need to be separated from _platformReserve
        require(owner != _platformReserve);

        platformReserve = _platformReserve;
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
     * @param _data additionl data
     */
    function transferToGame(address _playerAddr, address _gameContractAddress, bytes _data) onlyOwner {
        // platformReserve is not allowed to play, this check prevents owner take possession of platformReserve
        require(_playerAddr != platformReserve);

        // _gameContractAddress should be a contract, throw exception if owner will tries to transfer flunds to the individual address.
        // Require supported Token to have 'isContract' method.
        require(isContract(_gameContractAddress));

        // check if player have any funds in his deposit
        require(deposits[_playerAddr] > 0);

        // Create local joyGame object using address of given gameContract.
        JoyGameAbstract joyGame = JoyGameAbstract(_gameContractAddress);

        // Require this contract and gameContract to be owned by the same address.
        // This check prevents interaction with this contract from external contracts
        require(joyGame.getOwner() == owner);

        uint256 loc_fundsLocked = lockPlayerFunds(_playerAddr);

        // increase gameContract deposit for the time of the game
        // this funds are locked, and can not even be withdraw by owner
        deposits[_gameContractAddress] = deposits[_gameContractAddress].add(loc_fundsLocked);

        joyGame.onTokenReceived(_playerAddr, loc_fundsLocked, _data);

        // Populate event
        OnTokenReceived(msg.sender, loc_fundsLocked, _data);
    }

    /**
     * @dev  move given _value from player deposit to lockedFunds map.
     * Should be unlocked only after end of the game session (accountGameResult function).
     */
    function lockPlayerFunds(address _playerAddr) internal returns (uint256 locked) {
        uint256 player_deposit = deposits[_playerAddr];
        deposits[_playerAddr] = deposits[_playerAddr].sub(player_deposit);

        // check if player funds was locked successfully
        require(deposits[_playerAddr] == 0);

        lockedFunds[_playerAddr] = lockedFunds[_playerAddr].add(player_deposit);

        return lockedFunds[_playerAddr];
    }

    /**
     * @dev internal function that unlocks player funds.
     * Used in accountGameResult after
     */
    function unlockPlayerFunds(address _playerAddr) internal returns (uint256 unlocked) {
        uint256 player_lockedFunds = lockedFunds[_playerAddr];
        lockedFunds[_playerAddr] = lockedFunds[_playerAddr].sub(player_lockedFunds);

        // check if player funds was unlocked successfully
        require(lockedFunds[_playerAddr] == 0);

        deposits[_playerAddr] = deposits[_playerAddr].add(player_lockedFunds);

        return deposits[_playerAddr];
    }

    /**
     * @dev function that can be called from registred 'game contract' after closing player session to update state.
     *
     * Unlock Tokens from game contract and distribute Tokens according to final balance.
     * @param _playerAddr address of player that end his game session
     * @param _final_balance value that determine player wins and losses
     */
    function accountGameResult(address _playerAddr, uint256 _final_balance) external {

        JoyGameAbstract joyGame = JoyGameAbstract(msg.sender);

        // check if game contract is allowed to interact with this contract
        // must be the same owner
        require(joyGame.getOwner() == owner);

        // case where player deposit does not change
        if(_final_balance == lockedFunds[_playerAddr]) {
            unlockPlayerFunds(_playerAddr);
        }
        // case where player wins
        else if (_final_balance > lockedFunds[_playerAddr]) {
            uint256 playerEarnings = _final_balance.sub(lockedFunds[_playerAddr]);

            // check if contract is able to pay player a win
            require(playerEarnings <= deposits[platformReserve]);

            // unlock player funds with additional win from platformReserve
            unlockPlayerFunds(_playerAddr);

            deposits[platformReserve] = deposits[platformReserve].sub(playerEarnings);
            deposits[_playerAddr] = deposits[_playerAddr].add(playerEarnings);
        }
        // case where player lose
        else {
            uint256 playerLoss = lockedFunds[_playerAddr].sub(_final_balance);

            // distribute player Token loss to gameDev and platformReserve in 1:1 ratio
            // for odd loss additional Token goes to platformReserve
            // (example loss = 3 is gameDevPart = 1 and platformReserve = 2)
            uint256 gameDeveloperPart = playerLoss.div(2);
            uint256 platformReservePart = playerLoss.sub(gameDeveloperPart);

            // double check
            require( (gameDeveloperPart + platformReservePart) == playerLoss );

            address loc_gameDev = joyGame.getGameDev();

            deposits[loc_gameDev] = deposits[loc_gameDev].add(gameDeveloperPart);
            deposits[platformReserve] = deposits[platformReserve].add(platformReservePart);
        }

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
        require(isContract(_to) == false);

        deposits[msg.sender] = deposits[msg.sender].sub(_value);

        // Use m_supportedToken metheod to transfer real Tokens.
        m_supportedToken.transfer(_to, _value);
    }

    //---------------------- utils ---------------------------

    function isContract(address _addr) internal constant returns (bool) {
        uint codeLength;
        assembly {
            // Retrieve the size of the code on target address, this needs assembly .
            codeLength := extcodesize(_addr)
        }
        return (codeLength > 0);
    }
}

