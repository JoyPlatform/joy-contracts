pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

import '../deposit/GameDeposit.sol';
import './JoyGameAbstract.sol';



/**
 * @title JoyGameDemo
 * Contract that is responsible only for one game, and uses external given deposit contract
 */
contract JoyGameDemo is JoyGameAbstract {
    using SafeMath for uint;

    /**
     * @dev map containing information if given player have open game session.
     */
    mapping(address => bool) public openSessions;

    /**
     * Deposit contract that manage players funds in long-term,
     * deposit contract also contain information about supported token,
     * that will be supported also in this contract.
     */
    GameDeposit public m_playersDeposit;

    /**
     * @dev get amount of locked funds from coresponding to this contracti, deposit contract
     * Funds that are locked for the time of the game and waiting for game outcome.
     */
    function playerLockedFunds(address _player) public view returns (uint256) {
        return m_playersDeposit.playerLockedFunds(_player);
    }

    /**
     * Main constructor, that register source of value that will be used in games (depositContract)
     * and developer of the game
     * @param _gameDepositContract address of already deployed GameDeposit Contract
     * @param _gameDev address of game creator
     */
    constructor(address _gameDepositContract, address _gameDev) public {
        m_playersDeposit = GameDeposit(_gameDepositContract);

        // Require this contract and depositContract to be owned by the same address.
        // This check prevents connection to external malicious contract
        require(m_playersDeposit.owner() == owner);

        gameDev = _gameDev;
    }

    //----------------------------------------- start session -----------------------------------------

    /**
     * Override function
     * @dev Brings information about locked tokens from player_account on depositContract for the time of the game.
     * @param _player Player address
     * @param _value that will be given to the player in game session
     */
    function startGame(address _player, uint256 _value) external {
        // Check if calling contract is registred as m_playersDeposit,
        // non registred contracts are not allowed to affect to this game contract
        require(msg.sender == address(m_playersDeposit));

        // don't allow player to have two open sessions
        require(openSessions[_player] == false);

        openSessions[_player] = true;

        // brodcast log about new session
        // listening game server should start game after confirmation transaction containing execution of this function
        emit NewGameSession(_player, _value);
    }

    //----------------------------------------- end session -------------------------------------------

    function responseFromWS(address _playerAddr, uint256 _finalBalance, bytes32 hashOfGameProcess) public onlyOwner {
        endGame(GameOutcome(_playerAddr, _finalBalance, hashOfGameProcess) );
    }

    /**
     * Override function
     * @dev Save provable outcome of the game and distribute Tokens to gameDev, platform, and player
     * @param _gameOutcome struct with last updated amount of the WS wallets along with the Hash of provable data
     */

    function endGame(GameOutcome _gameOutcome) internal {
        // Save initial player funds to stack variable
        uint256 gameLockedFunds = playerLockedFunds(_gameOutcome.player);

        // double check if given player had possibility to play.
        // his lockedDeposit needed to be non-zero/positive.
        require(gameLockedFunds > 0);

        // Initial wrapping and real Tokens distribiution in deposit contract
        m_playersDeposit.accountGameResult(_gameOutcome.player, _gameOutcome.finalBalance);

        // close player game session
        openSessions[_gameOutcome.player] = false;

        // populate finite game info in transaction logs
        emit EndGameInfo(_gameOutcome.player,
                    gameLockedFunds,
                    _gameOutcome.finalBalance,
                    _gameOutcome.hashOfGameProcess);
    }
}
