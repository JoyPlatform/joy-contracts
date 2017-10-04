pragma solidity ^0.4.11;

import '../deposit/tokenDeposit.sol';
import '../math/SafeMath.sol';


/**
 * @title joyGameDemo
 * Contract that is responsible only for one game, and uses external given deposit contract
 */
contract joyGameDemo is ERC223ReceivingContract {
    using SafeMath for uint;

    /**
     * @dev mapping that contain information about locked Tokens
     * mapping of funds that are locked inside of this contract,
     * for the time of the game, and waiting for game outcome.
     */
    mapping(address => uint256) lockedDeposit;

    /**
     * Deposit contract that manage players funds in long-term,
     * deposit contract also contain information about supported token,
     * that will be supported also in this contract.
     */
    tokenDeposit m_playerDeposits;

    /**
     * gameDevAddr and platformAddr
     * draft : addresses needed at the end of each game;
     * players losses will be distributed over there addresses
     */
    address gameDevAddr;
    address platformAddr;

    /**
     * Main constructor
     * @param _depositContract address of already deployed depositContract
     * @param _gameDev address of game creator
     * @param _platformAddr addres of platform that host games
     */
    function joyGameDemo(address _depositContract, address _gameDev, address _platformAddr) {
        m_playerDeposits = tokenDeposit(_depositContract);

        gameDevAddr = _gameDev;
        platformAddr = _platformAddr;
    }

    /**
     * brings token from player_account on deposits contract to this contract, for the time of the game.
     */
    function startGame(address _playerAddr) {
        // throw exception if player balance equals zero
        require(0 < m_playerDeposits.balanceOfPlayer(_playerAddr));

    }

    // save outcome of the game and distribute Tokens to gameDev, platform, and player
    function endGame(bytes _gameOutcome) {

    }
}
