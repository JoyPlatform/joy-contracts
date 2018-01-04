pragma solidity ^0.4.18;

import './Subscription.sol';
import '../ownership/Ownable.sol';
import '../token/ERC223ReceivingContract.sol';
import '../token/JoyToken.sol';

/**
 * Contract for purchasing subscriptions with ERC223 JoyToken on the owned platform
 */
contract SubscriptionWithJoyToken is Subscription, Ownable, ERC223ReceivingContract {

    // instance of deployed JoyToken contract. Registered in constructor
    JoyToken public m_JoyToken;

    // constructor
    function SubscriptionWithJoyToken(address JoyTokenAddress) public {
        // create JoyToken instance from deployed address
        m_JoyToken = JoyToken(JoyTokenAddress);

        // set initially subscription price to 10000 base JoyToken units
        subscriptionPrice = 10000;
    }

    // setting new subscription price in base JoyToken units, owned function
    function setSubscriptionPrice(uint256 newPrice) onlyOwner public {
        subscriptionPrice = newPrice;
    }


    // child payable subscribe method, without arguments is not allowed in this contract
    function subscribe() payable {
        revert();
    }

    /**
     * subscription is internal function that takes subscriber address and sent value as argument
     * instead of using msg.sender and msg.value
     * @dev erc223 TokenTransfer invokes another function: 'onTokenReceived'
     */
    function subscribe(address subscriber, uint256 value) internal {
        // check if the value sent is correct
        require(value == subscriptionPrice);

        uint subTime = block.timestamp;
        subscriptionFrom[subscriber] = subTime;

        newSubscription(subscriber, subTime, subscriptionPrice);
    }

    /**
     * @dev Function that receive tokens, throw exception if tokens is not supported.
     * This contract could receive tokens, using functionalities designed in erc223 standard.
     * !! works only with tokens designed in erc223 way.
     */
    function onTokenReceived(address _from, uint _value, bytes _data) external {
        // msg.sender is a token-contract address here, get address of JoyToken and check
        require(msg.sender == address(m_JoyToken));

        // execute subscribe method
        subscribe(_from, _value);
    }


    // return collected funds in Wei that can be withdrawed by platform owner.
    function collectedFunds() public view returns (uint256) {
        // This contract address, 'this' is explicitly convertible to Address
        address contractAddress = this;
        return m_JoyToken.balanceOf(contractAddress);
    }

    // function that allows platform owner to withdraw funds
    function payOut(uint256 amount) onlyOwner public {
        address contractAddress = this;
        require(amount <= contractAddress.balance);

        // Use JoyToken method to transfer real Tokens to platform owner.
        m_JoyToken.transfer(msg.sender, amount);
    }
}

