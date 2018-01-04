pragma solidity ^0.4.16;

/**
 * Interface for Subscribtion contracts
 */
contract Subscription {
    // mapping of addresses to uint Unix time, when the subscription was bought
    mapping(address => uint) public subscriptionFrom;

    // acctual price for one-month subscription time
    uint256 public subscriptionPrice;

    // event
    event newSubscription(address indexed buyer, uint time, uint256 price);

    // setting new subscription price
    function setSubscriptionPrice(uint256 newPrice) public;

    // main method for purchasing subscription, payable
    function subscribe() public payable;

    // return information about collected
    function collectedFunds() public view returns (uint256);

    /**
     * function that allows to withdraw funds
     * @param amount of funds in base unit
     */
    function payOut(uint256 amount) public;
}
