pragma solidity ^0.4.11;

/**
 * Contract that is working with tokens which implements erc233 transfers features
 */
contract ERC223ReceivingContract {
	// Event that inform about recieved tokens
	event OnTokenReceived(address _from, uint value, bytes indexed data);

	/**
	 * dox TODO
	 */
	function onTokenReceived(address _from, uint _value, bytes _data);
}


