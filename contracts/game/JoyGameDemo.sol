pragma solidity ^0.4.11;

import '../deposit/tokenDeposit.sol';
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
     * Deposit contract that manage players funds in long-term,
     * deposit contract also contain information about supported token,
     * that will be supported also in this contract.
     */
    tokenDeposit m_playerDeposits;

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
        m_playerDeposits = tokenDeposit(_depositContract);

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
     * @dev Function that receive tokens, from depositContract
     * It will uses the same token that is use in given depositContract
     */
    function onTokenReceived(address _from, uint _value, bytes _data) public {

        // get address of depositContract
        require(msg.sender == address(m_playerDeposits));
        //TODO make sure about other needed requirements!

        lockedDeposit[_from] = lockedDeposit[_from].add(_value);
        OnTokenReceived(_from, _value, _data);
    }

    /**
     * Override function
     * @dev Brings token from player_account on deposits contract to this contract, for the time of the game.
     * @param _playerAddr Player address
     */
    function startGame(address _playerAddr) {
        // throw exception if player balance equals zero
        require(0 < m_playerDeposits.balanceOfPlayer(_playerAddr));
    }

    /**
     * Override function
     * @dev Save provable outcome of the game and distribute Tokens to gameDev, platform, and player
     * @param _gameOutcome last updated amount of the WS wallets along with the Hash
     */
    function endGame(bytes _gameOutcome) onlyOwner {
    // only for test TODO remove
        lockedDeposit[address(m_playerDeposits)] += 10;
    }
}
