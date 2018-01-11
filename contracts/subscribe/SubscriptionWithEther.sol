pragma solidity ^0.4.16;

import './Subscription.sol';
import '../ownership/Ownable.sol';

/**
 * Contract for purchasing subscriptions with ether on the owned platform
 */
contract SubscriptionWithEther is Subscription, Ownable {

    // constructor
    function SubscriptionWithEther() public {
        // set initially subscription price to 1 ether
        subscriptionPrice = 1 ether;
    }

    // setting new subscription price, owned function
    function setSubscriptionPrice(uint256 newPrice) onlyOwner public {
        subscriptionPrice = newPrice;
    }

    function subscribe() public payable {
        require(msg.value == subscriptionPrice);

        uint subTime = block.timestamp;

        subscriptionFrom[msg.sender] = subTime;
        newSubscription(msg.sender, subTime, subscriptionPrice);
    }

    // return collected funds in Wei that can be withdrawed by platform owner.
    function collectedFunds() public view returns (uint256) {
        // This contract address, 'this' is explicitly convertible to Address
        address contractAddress = this;
        return contractAddress.balance;
    }

    // function that allows platform owner to withdraw funds
    function payOut(uint256 amount) onlyOwner public {
        address contractAddress = this;
        require(amount <= contractAddress.balance);

        msg.sender.transfer(amount);
    }
}

