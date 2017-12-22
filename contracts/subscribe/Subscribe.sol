pragma solidity ^0.4.18;

import '../ownership/Ownable.sol';

// basic contract to purchase subscriptions on the owned platform
contract Subscription is Ownable {

    // acctual price for one-month subscription time (in wei)
    uint256 public subscriptionPrice = 10000;

    // mapping of addresses to uint Unix time, when the subscription was bought
    mapping(address => uint) public subscriptionFrom;

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
}

