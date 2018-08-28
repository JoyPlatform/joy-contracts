pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

import './Subscription.sol';
import '../token/ERC223ReceivingContract.sol';
import '../token/JoyToken.sol';
import '../token/JoyToken_Upgraded.sol';

/**
 * Contract for purchasing subscriptions with ERC223 JoyToken on the owned platform
 */
contract SubscriptionWithJoyToken is Subscription, Ownable, ERC223ReceivingContract {
    // instance of deployed JoyToken contract. Registered in constructor
    JoyToken public m_JoyToken;

    constructor(address JoyTokenAddress) public {
        // create JoyToken instance from deployed address
        m_JoyToken = JoyToken(JoyTokenAddress);

        // set initially subscription price to 100 base JoyToken units
        subscriptionPrice = 100;
    }

    // setting new subscription price in base JoyToken units, owned function
    function setSubscriptionPrice(uint256 newPrice) onlyOwner public {
        subscriptionPrice = newPrice;
    }

    /**
     * subscription is internal function that takes subscriber address and sent value as argument
     * instead of using msg.sender and msg.value
     * @dev erc223 TokenTransfer invokes another function: 'onTokenReceived'
     */
    function subscribe(address subscriber, uint256 value, uint amountOfTime) internal {
        // check if the value sent is correct
        require(value == (subscriptionPrice * amountOfTime));

        // creating memory object about subsciption time-info
        subscribeInfo memory subInfo = subscribeInfo(block.timestamp, amountOfTime);

        allSubscriptions[subscriber] = subInfo;
        emit newSubscription(subscriber, subscriptionPrice, subInfo.timepoint, subInfo.amountOfTime);
    }

    /**
     * @dev Function that receive tokens, throw exception if tokens is not supported.
     * This contract could receive tokens, using functionalities designed in erc223 standard.
     * !! works only with tokens designed in erc223 way.
     */
    function tokenFallback(address from, uint256 value, bytes data) external {
        // msg.sender is a token-contract address here, get address of JoyToken and check
        require(JoyTokenUpgraded(msg.sender).getUnderlyingTokenAddress() == address(m_JoyToken));

        // execute subscribe method
        subscribe(from, value, bytesToUint256(data));
    }


    // return collected funds in Wei that can be withdrawed by platform owner.
    function collectedFunds() public view returns (uint256) {
        // This contract address, 'this' is explicitly convertible to Address
        address contractAddress = this;
        return m_JoyToken.balanceOf(contractAddress);
    }

    // function that allows platform owner to withdraw funds to given address
    function payOut(address to, uint256 amount) onlyOwner public {
        address contractAddress = this;

        require(amount <= m_JoyToken.balanceOf(contractAddress));

        // Use JoyToken method to transfer real Tokens to platform owner.
        m_JoyToken.transfer(to, amount);
    }

    /**
     * @dev Helper pure, internal function that converts bytes to uint256 number
     **/
    function bytesToUint256(bytes b) pure internal returns (uint256){
        // there is no sense to convert bigger numbers
        require(b.length <= 64);

        uint256 number;
        for(uint i = 0; i < b.length; i++){
            number = number + uint(b[i]) * (2 ** (8 * (b.length - (i + 1))));
        }
        return number;
     }
}
