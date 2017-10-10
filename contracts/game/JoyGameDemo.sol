pragma solidity ^0.4.11;

import '../deposit/PlatformDeposit.sol';
import '../math/SafeMath.sol';
import '../token/ERC223ReceivingContract.sol';
import '../ownership/Ownable.sol';
import './JoyGameAbstract.sol';



/**
 * @title JoyGameDemo
 * Contract that is responsible only for one game, and uses external given deposit contract
 */
contract JoyGameDemo is JoyGameAbstract {
    using SafeMath for uint;

    /**
     * @dev mapping that contain information about locked Tokens
     * mapping of funds that are locked inside of this contract,
     * for the time of the game, and waiting for game outcome.
     */
    mapping(address => uint256) lockedDeposit;

    /**
     * @dev map containing information if given player have open game session.
     */
    mapping(address => bool) public openSessions;


    /**
     * Deposit contract that manage players funds in long-term,
     * deposit contract also contain information about supported token,
     * that will be supported also in this contract.
     */
    PlatformDeposit m_playerDeposits;

    /**
     * gameDevAddr is a developer of a game, this address is needed at the end of each game session;
     * part of players losses will be distributed to this address
     */
    address gameDevAddr;

    /**
     * Main constructor
     * @param _depositContract address of already deployed depositContract
     * @param _gameDev address of game creator
     */
    function JoyGameDemo(address _depositContract, address _gameDev) {
        m_playerDeposits = PlatformDeposit(_depositContract);

        gameDevAddr = _gameDev;
    }

    /**
     * Override function
     * @dev Function to access owner of this contract (external lowers the cost of gas)
     */
    function getOwner() external returns (address contractOwner) {
        return owner;
    }

    /**
     * Override function
     * @dev Function to access game developer (external lowers the cost of gas)
     */
    function getGameDev() external returns (address owner) {
        return gameDevAddr;
    }
    //----------------------------------------- start session -----------------------------------------

    /**
     * Override function
     * @dev Function that receive tokens, from depositContract
     * It will uses the same token that is use in given depositContract
     */
    function onTokenReceived(address _from, uint _value, bytes _data) public {

        // Check if we are receiving Tokens from depisot contract that we registred as m_playerDeposits
        require(msg.sender == address(m_playerDeposits));

        OnTokenReceived(_from, _value, _data);
    }

    /**
     * Override function
     * @dev Brings token from player_account on deposits contract to this contract, for the time of the game.
     * @param _playerAddr Player address
     */
    function startGame(address _playerAddr, uint256 _value) internal {
        // don't allow player to have two open sessions
        require(openSessions[_playerAddr] == false);

        lockedDeposit[_playerAddr] = lockedDeposit[_playerAddr].add(_value);
    }

    //----------------------------------------- end session -------------------------------------------

    function responseFromWS(address _playerAddr, uint256 _final_balance, bytes32 hashOfGameProcess) onlyOwner {
        endGame( GameOutcome(_playerAddr, _final_balance, hashOfGameProcess) );
    }

    /**
     * Override function
     * @dev Save provable outcome of the game and distribute Tokens to gameDev, platform, and player
     * @param _gameOutcome struct with last updated amount of the WS wallets along with the Hash of provable data
     */

    function endGame(GameOutcome _gameOutcome) internal {
        // double check if given player had possibility to play.
        // his lockedDeposit needed to be non-zero/positive.
        require(lockedDeposit[_gameOutcome.playerAddr] > 0);

        // Save initial player funds to local variable
        // (security reasons) we want to reset player lockedDeposit before actual Tokend distibiution
        uint256 gameLockedFunds;

        // unlock localy played funds
        lockedDeposit[_gameOutcome.playerAddr] = 0;

        // Initial wrapping and real Tokens distribiution in deposit contract
        m_playerDeposits.accountGameResult(_gameOutcome.playerAddr, _gameOutcome.final_balance);

        // populate finite game info in transaction logs
        EndGameInfo(_gameOutcome.playerAddr,
                    gameLockedFunds,
                    _gameOutcome.final_balance,
                    _gameOutcome.hashOfGameProcess);
    }
}

