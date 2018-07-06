pragma solidity ^0.4.16;

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
        newSubscription(subscriber, subscriptionPrice, subInfo.timepoint, subInfo.amountOfTime);
    }

    /**
     * @dev Function that receive tokens, throw exception if tokens is not supported.
     * This contract could receive tokens, using functionalities designed in erc223 standard.
     * !! works only with tokens designed in erc223 way.
     */
    function tokenFallback(address from, uint value, bytes data) external {
        // msg.sender is a token-contract address here, get address of JoyToken and check
        require(msg.sender == address(m_JoyToken));

        // execute subscribe method
        subscribe(from, value, bytesHexToUint256(data));
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
     * pure, internal helper function that converts bytes in hex encoding to uint256 number
     * example of outputs:
     * bytes: "ff" -> uint256: 255
     * bytes: "AD" -> uint256: 173  // works with both lowercase and uppercase
     * bytes: "2Ffd" -> uint256: 12285
     * notice:
     **/
    function bytesHexToUint256(bytes b) pure public returns (uint256) {
        // there is no sense to convert bigger numbers
        require(b.length <= 64);

        uint256 result = 0;
        for (uint i = 0; i < b.length; i++) {
            bool syntax = false;
            uint256 c = uint256(b[i]);

            // [0-9]
            if (c >= 48 && c <= 57) {
                syntax = true;
                result = result * 16 + (c - 48);
            }
            // [A-F]
            if(c >= 65 && c<= 70) {
                syntax = true;
                result = result * 16 + (c - 55);
            }
            // [a-f]
            if(c >= 97 && c<= 102) {
                syntax = true;
                result = result * 16 + (c - 87);
            }
            // reverting bad input syntax
            require(syntax);
        }
        return result;
    }
}
