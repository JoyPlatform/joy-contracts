pragma solidity ^0.4.16;

/**
 * Interface for Subscribtion contracts
 */
contract Subscription {
    // struct that contain made subscription information
    struct subscribeInfo {
        // Unix time, when the subscription was bought
        uint timepoint;
        // time in seconds, how much of subscription time was bought
        uint amountOfTime;
    }

    // mapping of addresses to information about made subscription
    mapping(address => subscribeInfo) public allSubscriptions;

    // basic acctual price of one second of subscription time
    uint256 public subscriptionPrice;

    // event
    event newSubscription(address indexed buyer, uint256 price, subscribeInfo);

    // setting new subscription price
    function setSubscriptionPrice(uint256 newPrice) public;

    // main method for purchasing subscription, payable
    function subscribe() public payable;

    // return information about collected funds
    function collectedFunds() public view returns (uint256);

    /**
     * function that allows to withdraw funds
     * @param amount of funds in base unit
     */
    function payOut(uint256 amount) public;
}
