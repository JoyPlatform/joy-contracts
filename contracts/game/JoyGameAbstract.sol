pragma solidity ^0.4.11;

import '../token/ERC223ReceivingContract.sol';
import '../ownership/Ownable.sol';

contract JoyGameAbstract is Ownable, ERC223ReceivingContract {

    // External function to get access to the owner of the game contract
    function getOwner() external returns (address owner);

    /**
     * @dev Start game
     * @param _playerAddr Player address
     */
    function startGame(address _playerAddr);

    /**
     * @dev End game
     * @param _gameOutcome Game output provided from external source
     */
    function endGame(bytes _gameOutcome);

    /**
     * Override function
     * @dev Function that only throw exception, real functionality should be implementet in derived class.
     * Added because of linearization reasons
     */
    function onTokenReceived(address _from, uint _value, bytes _data) {
        // revert throw exception and prevents Tokens to be send in.
        revert();
    }
}

