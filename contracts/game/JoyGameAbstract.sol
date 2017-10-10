pragma solidity ^0.4.11;

import '../token/ERC223ReceivingContract.sol';
import '../ownership/Ownable.sol';

contract JoyGameAbstract is Ownable {

    // External function to get access to the owner of the game contract
    function getOwner() external returns (address owner);

    // External function to get access to game developer
    function getGameDev() external returns (address owner);

    /**
     * @dev Start game
     * @param _playerAddr Player address
     */
    function startGame(address _playerAddr, uint256 _value) internal;


    // Event that will populate in blockchain information about finite game session
    event EndGameInfo(address player, uint256 start_balance, uint256 final_balance, bytes32 hashOfGameProcess);


    /**
     * @dev struct containg outcome of the game, with provable hash, that could be match with game history in GS
     * (or mayby it could be cryptoanlyzed/mined)
     */
    struct GameOutcome {
        address playerAddr;
        uint256 final_balance;
        // Hashed course of the finite game
        bytes32 hashOfGameProcess;
    }

    /**
     * @dev End game
     * @param _gameOutcome Game output provided from external source
     */
    function endGame(GameOutcome _gameOutcome) internal;

}

