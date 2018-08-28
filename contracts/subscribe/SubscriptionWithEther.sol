pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

import './Subscription.sol';

/**
 * Contract for purchasing subscriptions with ether on the owned platform
 */
contract SubscriptionWithEther is Subscription, Ownable {

    constructor() public {
        // set initially subscription price in base wei units
        subscriptionPrice = 0.02 szabo; // 20 Gwei
    }

    // setting new subscription price, owned function
    function setSubscriptionPrice(uint256 newPrice) onlyOwner public {
        subscriptionPrice = newPrice;
    }

    // ammountOfTime means amount of subscription time (in seconds)
    function subscribe(uint256 amountOfTime) public payable {
        require(msg.value == (subscriptionPrice * amountOfTime));

        // creating memory object about subsciption time-info
        subscribeInfo memory subInfo = subscribeInfo(block.timestamp, amountOfTime);

        allSubscriptions[msg.sender] = subInfo;
        emit newSubscription(msg.sender, subscriptionPrice, subInfo.timepoint, subInfo.amountOfTime);
    }

    // return collected funds in Wei that can be withdrawed by platform owner.
    function collectedFunds() public view returns (uint256) {
        // This contract address, 'this' is explicitly convertible to Address
        address contractAddress = this;
        return contractAddress.balance;
    }

    // function that allows platform owner to withdraw funds to given address
    function payOut(address to, uint256 amount) onlyOwner public {
        address contractAddress = this;
        require(amount <= contractAddress.balance);

        to.transfer(amount);
    }
}
