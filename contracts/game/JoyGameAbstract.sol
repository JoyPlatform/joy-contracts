pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract JoyGameAbstract is Ownable {
    /**
     * gameDevAddr is a developer of a game, this address is needed at the end of each game session;
     * part of platform profits will be distributed to this address
     */
    address public gameDev;

    // Event about new game session started
    event NewGameSession(address indexed player, uint256 start_balance);

    // Event about refreshed with new funds game session
    event RefreshGameSession(address indexed player, uint256 increased_value);

    // Event about finite game session
    event EndGameInfo(address indexed player,
                      uint256 start_balance,
                      uint256 remainBalance,
                      uint256 finalBalance,
                      bytes32 indexed gameProcessId,
                      bytes32 indexed gameSignature);

    /**
     * @dev Abstract external function that starts game session.
     * @param _playerAddr Player address
     * @param _value that will be given to the player in game session
     */
    function startGame(address _playerAddr, uint256 _value) external;

    /**
     * @dev struct containg outcome of the game, with provable signature, that could be match with game history in GS
     * (or mayby it could be cryptoanlyzed/mined)
     */
    struct GameOutcome {
        address player;
        uint256 remainBalance; // balance that stays in the game
        uint256 finalBalance; // actual player balance got from game server
        bytes32 gameProcessId; // id of game outcome process
        bytes32 gameSignature; // provable signature of of the completed game session
    }

    /**
     * @dev Abstract internal function that end game session
     * @param _gameOutcome Game output provided from game instance
     */
    function endGame(GameOutcome _gameOutcome) internal;

}
