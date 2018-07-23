pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

import './PlatformDeposit.sol';
import '../token/JoyReceivingContract.sol';
import '../game/JoyGameAbstract.sol';

/**
 * Main token deposit contract.
 *
 * In demo version only playing in on game at the same time is allowed,
 * so locks, unlocks, and transfer function operate on all player deposit.
 */
contract GameDeposit is PlatformDeposit, JoyReceivingContract, Ownable {
    mapping(address => uint256) lockedFunds;

    /**
     * platformReserve - Main platform address and reserve for winnings
     * Important address that collecting part of players losses as reserve which players will get winnings.
     * For security reasons "platform reserve address" needs to be separated/other that address of owner of this contract.
     */
    address public platformReserve;

    /**
     * @dev Constructor
     * @param _supportedToken The address of token contract that will be supported as players deposit
     */
    constructor(address _supportedToken, address _platformReserve) PlatformDeposit(_supportedToken) public {
        // owner need to be separated from _platformReserve
        require(owner != _platformReserve);

        platformReserve = _platformReserve;
    }

    /**
     * @dev Gets the locked funds of the specified address.
     * @param _player Player address.
     * @return An uint256 representing the amount of locked tokens.
     */
    function playerLockedFunds(address _player) public constant returns (uint256) {
        return lockedFunds[_player];
    }

    /**
     * @dev Function that receive tokens and simultaneously lock it in for game purposes.
     * This contract could receive tokens, designed analogous to tokenFallback function from erc223.
     * throw exception if tokens is not supported
     */
    function customDeposit(address _playerAddr, address _gameContractAddress, uint256 _value, bytes) external {
        require(JoyTokenUpgraded(msg.sender).getUnderlyingTokenAddress() == address(m_supportedToken));

        lockedFunds[_playerAddr] = lockedFunds[_playerAddr].add(_value);

        // Create local joyGame object using address of given gameContract.
        JoyGameAbstract joyGame = JoyGameAbstract(_gameContractAddress);

        // Require this contract and gameContract to be owned by the same address.
        // This check prevents interaction with this contract from external contracts
        require(joyGame.owner() == owner);

        joyGame.startGame(_playerAddr, _value);
    }

    /**
     * @dev move given _value from player deposit to lockedFunds map.
     * Should be unlocked only after end of the game session (accountGameResult function).
     */
    function lockPlayerFunds(address _playerAddr, address _gameContractAddress) internal returns (uint256 locked) {
        uint256 player_deposit = deposits[_playerAddr];
        deposits[_playerAddr] = deposits[_playerAddr].sub(player_deposit);

        lockedFunds[_playerAddr] = lockedFunds[_playerAddr].add(player_deposit);

        // increase gameContract deposit
        // this funds are locked, contracts can not payOut
        deposits[_gameContractAddress] = deposits[_gameContractAddress].add(player_deposit);

        return lockedFunds[_playerAddr];
    }

    /**
     * @dev internal function that unlocks player funds.
     * Used in accountGameResult after
     */
    function unlockPlayerFunds(address _playerAddr, address _gameContractAddress) internal returns (uint256 unlocked) {
        uint256 player_lockedFunds = lockedFunds[_playerAddr];
        lockedFunds[_playerAddr] = lockedFunds[_playerAddr].sub(player_lockedFunds);

        deposits[_playerAddr] = deposits[_playerAddr].add(player_lockedFunds);

        // decrease gameContract deposit
        deposits[_gameContractAddress] = deposits[_gameContractAddress].sub(player_lockedFunds);

        return deposits[_playerAddr];
    }

    /**
     * @dev Temporarily transfer funds to the game contract
     *
     * This method can be used to lock funds in order to perform specific actions by external contract.
     * That construct allow to adding new games without modifying this contract.
     * Important security check is that execution of this method will work:
     *  only if the owner of the game will be same as the owner of this contract
     *
     * @param _player address of registered player
     * @param _gameContractAddress address to the game contract
     */
    function transferToGame(address _player, address _gameContractAddress) public onlyOwner {
        // platformReserve is not allowed to play, this check prevents owner to take possession of platformReserve
        require(_player != platformReserve);

        // _gameContractAddress should be a contract, throw exception if owner will tries to transfer funds to the individual address.
        // Require supported Token to have 'isContract' method.
        require(isContract(_gameContractAddress));

        // check if player have any funds in his deposit
        require(deposits[_player] > 0);

        // Create local joyGame object using address of given gameContract.
        JoyGameAbstract joyGame = JoyGameAbstract(_gameContractAddress);

        // Require this contract and gameContract to be owned by the same address.
        // This check prevents interaction with this contract from external contracts
        require(joyGame.owner() == owner);

        uint256 local_fundsLocked = lockPlayerFunds(_player, _gameContractAddress);

        joyGame.startGame(_player, local_fundsLocked);
    }

    /**
     * @dev function that can be called from registered 'game contract' after closing player session to update state.
     *
     * Unlock Tokens from game contract and distribute Tokens according to final balance.
     * @param _playerAddr address of player that end his game session
     * @param _finalBalance value that determine player wins and losses
     */
    function accountGameResult(address _playerAddr, uint256 _finalBalance) external {

        JoyGameAbstract joyGame = JoyGameAbstract(msg.sender);

        // check if game contract is allowed to interact with this contract
        // must be the same owner
        require(joyGame.owner() == owner);

        // case where player deposit does not change
        if(_finalBalance == lockedFunds[_playerAddr]) {
            unlockPlayerFunds(_playerAddr, msg.sender);
        }
        // case where player wins
        else if (_finalBalance > lockedFunds[_playerAddr]) {
            uint256 playerEarnings = _finalBalance.sub(lockedFunds[_playerAddr]);

            // check if contract is able to pay player a win
            require(playerEarnings <= deposits[platformReserve]);

            // unlock player funds with additional win from platformReserve
            unlockPlayerFunds(_playerAddr, msg.sender);

            deposits[platformReserve] = deposits[platformReserve].sub(playerEarnings);
            deposits[_playerAddr] = deposits[_playerAddr].add(playerEarnings);
        }
        // case where player lose
        else {
            // substract player loss from player locked funds
            uint256 playerLoss = lockedFunds[_playerAddr].sub(_finalBalance);
            lockedFunds[_playerAddr] = lockedFunds[_playerAddr].sub(playerLoss);

            // double check
            require(lockedFunds[_playerAddr] == _finalBalance);

            // if do not lose all
            if (lockedFunds[_playerAddr] != 0) {
                // unlock rest of the player funds
                unlockPlayerFunds(_playerAddr, msg.sender);
            }

            // distribute player Token loss to gameDev and platformReserve in 1:1 ratio
            // for odd loss additional Token goes to platformReserve
            // (example loss = 3 is gameDevPart = 1 and platformReserve = 2)
            uint256 gameDeveloperPart = playerLoss.div(2);
            uint256 platformReservePart = playerLoss.sub(gameDeveloperPart);

            // double check
            require( (gameDeveloperPart + platformReservePart) == playerLoss );

            address loc_gameDev = joyGame.gameDev();

            deposits[loc_gameDev] = deposits[loc_gameDev].add(gameDeveloperPart);
            deposits[platformReserve] = deposits[platformReserve].add(platformReservePart);
        }
    }
}
