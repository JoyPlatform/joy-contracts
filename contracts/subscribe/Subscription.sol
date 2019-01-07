pragma solidity ^0.4.23;

/**
 * Interface for Subscribtion contracts
 */
contract Subscription {
    // struct that contain made subscription information
    struct subscribeInfo {
        // Unix time, when the subscription was bought
        uint256 timepoint;
        // time in seconds, how much of subscription time was bought
        uint256 amountOfTime;
    }

    // mapping of addresses to information about made subscription
    mapping(address => subscribeInfo) public allSubscriptions;

    // basic acctual price of one second of subscription time
    uint256 public subscriptionPrice;

    // event - two last arguments are from subscribeInfo
    event newSubscription(address indexed buyer, uint256 price, uint256 timepoint, uint256 amountOfTime);

    // setting new subscription price
    function setSubscriptionPrice(uint256 newPrice) public;

    // return information about collected funds
    function collectedFunds() public view returns (uint256);

    /**
     * function that allows to withdraw funds
     * @param to - address where funds will be transferred
     * @param amount of funds in base unit
     */
    function payOut(address to, uint256 amount) public;
}
