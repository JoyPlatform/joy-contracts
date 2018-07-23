pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

import '../token/JoyToken.sol';
import '../token/JoyToken_Upgraded.sol';
import '../token/ERC223ReceivingContract.sol';
import '../game/JoyGameAbstract.sol';

/**
 * Main token deposit contract.
 */
contract PlatformDeposit is ERC223ReceivingContract {
    using SafeMath for uint256;

    // Token that is supported by this contract. Should be registered in constructor
    JoyToken public m_supportedToken;

    mapping(address => uint256) deposits;

    /**
     * @dev Constructor
     * @param _supportedToken The address of token contract that will be supported as players deposit
     */
    constructor(address _supportedToken) public {
        m_supportedToken = JoyToken(_supportedToken);
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param _player The address to query the the balance of.
     * @return An uint256 representing the amount owned by the passed address.
     */
    function balanceOfPlayer(address _player) public constant returns (uint256) {
        return deposits[_player];
    }

    /**
     * @dev Function that receive tokens, throw exception if tokens is not supported.
     * This contract could receive tokens, using functionalities designed in erc223 standard.
     * !! works only with tokens designed in erc223 way.
     */
    function tokenFallback(address _from, uint256 _value, bytes) external {
        // msg.sender is a token-contract address here
        // we will use this information to filter what token we accept as deposit

        // require tokens sent with erc221 upgraded contract to be exac same as supported erc20 tokens
        require(JoyTokenUpgraded(msg.sender).getUnderlyingTokenAddress() == address(m_supportedToken));

        deposits[_from] = deposits[_from].add(_value);
    }

    /**
     * @dev Function that could be executed by players to withdraw their deposit
     */
    function payOut(address _to, uint256 _value) public {
        // use transfer function from supported token.
        // should be used from player address that was registered in deposits
        require(_value <= deposits[msg.sender], "Player balance is to low.");

        /**
         * Prevents payOut to the contract address.
         * This trick deprives owner incentives to steal Tokens from players.
         * Even if owner use 'transferToGame' method to transfer some deposits to the fake contract,
         * he will not be able to withdraw Tokens to any private address.
         */
        require(isContract(_to) == false, "Address given should not be address of the contract.");

        deposits[msg.sender] = deposits[msg.sender].sub(_value);

        // Use m_supportedToken method to transfer real Tokens.
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
