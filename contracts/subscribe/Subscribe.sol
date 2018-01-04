pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';

/**
 * Contract for purchasing subscriptions with ether on the owned platform
 */
contract Subscription is Ownable {

    // acctual price for onemonth subscription time (in wei)
    uint256 public subscriptionPrice;

    // mapping of addresses to uint Unix time, when the subscription was bought
    mapping(address => uint) public subscriptionFrom;

    // constructor
    function Subscription() public {
        // set initially subscription price to 1 ether
        subscriptionPrice = 1 ether;
        subscriptionPrice;
    }

    // event
    event newSubscription(address indexed buyer, uint time, uint256 price);

    // owner function that allows to change subscribtion price
    function setSubscriptionPrice(uint256 newPrice) public onlyOwner {
        subscriptionPrice = newPrice;
    }

    // main function for buyers, last block timestamp is saved in subscribers map
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

