pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

import './PlatformDeposit.sol';
import '../token/JoyReceivingContract.sol';
import '../game/JoyGameAbstract.sol';

/**
 * Main GameDeposit contract
 * Holds players deposits including funds locked in games in decentralized way.
 * Owner is needed only to prevent interactions from malicious contracts.
 * New gamePlatforms can be added without changes in this contract.
 */
contract GameDeposit is PlatformDeposit, JoyReceivingContract, Ownable {
    /**
     * @dev player address => game address => locked funds.
     */
    mapping(address => mapping(address => uint256)) lockedFunds;

    /**
     * @dev platformReserve - Main platform address and reserve for winnings
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
    function playerLockedFunds(address _player, address _game) public constant returns (uint256) {
        return lockedFunds[_player][_game];
    }

    /**
     * @dev Function that receive tokens and simultaneously lock it in for game purposes.
     * This contract could receive tokens, designed analogous to tokenFallback function from erc223.
     * throw exception if tokens is not supported
     */
    function customDeposit(address _player, address _game, uint256 _value, bytes) external {
        require(JoyTokenUpgraded(msg.sender).getUnderlyingTokenAddress() == address(m_supportedToken));

        lockedFunds[_player][_game] = lockedFunds[_player][_game].add(_value);

        // Create local joyGame object using address of given gameContract.
        JoyGameAbstract joyGame = JoyGameAbstract(_game);

        // Require this contract and gameContract to be owned by the same address.
        // This check prevents interaction with this contract from external contracts
        require(joyGame.owner() == owner);

        joyGame.startGame(_player, _value);
    }

    /**
     * @dev move given _value from player deposit to lockedFunds mapping.
     * Should be unlocked only after end of the game session (accountGameResult function).
     */
    function lockPlayerFunds(address _player, address _game, uint256 _value) internal {
        require(_value <= deposits[_player], "Can not lock player tokens, not enough funds in deposit");
        deposits[_player] = deposits[_player].sub(_value);

        lockedFunds[_player][_game] = lockedFunds[_player][_game].add(_value);
    }

    /**
     * @dev internal function that unlocks player funds.
     * Used in accountGameResult after
     */
    function unlockPlayerFunds(address _player, address _game, uint256 _value) internal {
        require(_value <= lockedFunds[_player][_game], "Can not unlock player tokens, not enough locked funds in game.");
        lockedFunds[_player][_game] = lockedFunds[_player][_game].sub(_value);

        deposits[_player] = deposits[_player].add(_value);
    }

    /**
     * @dev Temporarily transfer funds to the game contract
     *
     * This method can be used to lock funds in order to perform specific actions by external contract.
     * That construct allow to adding new games without modifying this contract.
     * Important security check is that execution of this method will work:
     *  only if the owner of the game will be same as the owner of this contract
     *
     * @param _game address to the game contract
     * @param _value amount of tokens to lock in game
     */
    function transferToGame(address _game, uint256 _value) public {
        // platformReserve is not allowed to play, this check prevents owner to take possession of platformReserve
        require(msg.sender != platformReserve, "platformReserve can not play.");

        // check if player have any funds in his deposit
        require(deposits[msg.sender] > 0, "Player have zero-balance deposit.");

        // _game should be a contract, throw exception if owner will tries to transfer funds to the individual address.
        // Require supported Token to have 'isContract' method.
        require(isContract(_game), "_game need to be a contract address.");

        // Create local joyGame object using address of given gameContract.
        JoyGameAbstract joyGame = JoyGameAbstract(_game);

        // Require this contract and gameContract to be owned by the same address.
        // This check prevents interaction with this contract from external contracts
        require(joyGame.owner() == owner);

        lockPlayerFunds(msg.sender, _game, _value);
        joyGame.startGame(msg.sender, _value);
    }


    /**
     * @dev function that distributes winnings after closing game player session.
     *
     * @param _player address of player that end his game session
     * @param _remainBalance amount of tokens that will stay locked in game
     * @param _finalBalance value that determine player wins and losses
     */
    function accountGameResult(address _player, uint256 _remainBalance, uint256 _finalBalance) public {
        // In case of _remainBalance == _finalBalance, means not unlocking any tokens from game.
        require(_remainBalance <= _finalBalance, "insufficient winnings for given remaining balance");

        // msg.sender is a gameContract here
        JoyGameAbstract joyGame = JoyGameAbstract(msg.sender);
        uint256 l_playerLockedFunds = lockedFunds[_player][msg.sender];

        // check if game contract is allowed to interact with this contract
        // must be the same owner
        require(joyGame.owner() == owner, "joyGame contract is not allowed to interact with this deposit");

        // case where player wins
        if (_finalBalance > l_playerLockedFunds) {
            uint256 playerEarnings = _finalBalance.sub(l_playerLockedFunds);

            // check if contract is able to pay player a win
            require(playerEarnings <= deposits[platformReserve], "platformReserve deposit is too small to cover the winning");

            // with additional win from platformReserve
            deposits[platformReserve] = deposits[platformReserve].sub(playerEarnings);
            lockedFunds[_player][msg.sender] = lockedFunds[_player][msg.sender].add(playerEarnings);
        }
        // case where player lose
        else if (_finalBalance < l_playerLockedFunds) {
            // substract player loss from player locked funds
            uint256 playerLoss = lockedFunds[_player][msg.sender].sub(_finalBalance);
            lockedFunds[_player][msg.sender] = _finalBalance;

            // distribute player Token loss to gameDev and platformReserve in 1:1 ratio
            // for odd loss additional Token goes to platformReserve
            // (example loss = 3 is gameDevPart = 1 and platformReserve = 2)
            uint256 gameDeveloperPart = playerLoss.div(2);
            uint256 platformReservePart = playerLoss.sub(gameDeveloperPart);

            address l_gameDev = joyGame.gameDev();

            deposits[l_gameDev] = deposits[l_gameDev].add(gameDeveloperPart);
            deposits[platformReserve] = deposits[platformReserve].add(platformReservePart);
        }

        // if do not lose all and do not remaining all
        if (lockedFunds[_player][msg.sender] != 0 && _remainBalance != _finalBalance) {
            uint256 l_fundsToUnlock = _finalBalance.sub(_remainBalance);
            // unlock rest of the player funds, excluding remaining balance.
            unlockPlayerFunds(_player, msg.sender, l_fundsToUnlock);
        }
    }

    /**
     * @dev accountGameResult and payOut player winnings directly to the player wallet.
     */
    function payOutGameResult(address _player, uint256 _remainBalance, uint256 _finalBalance) external {
        accountGameResult(_player, _remainBalance, _finalBalance);

        if (balanceOfPlayer(_player) != 0) {
            // _from _player deposit to _player public address
            payOutInternal(_player, _player, balanceOfPlayer(_player));
        }
    }
}
