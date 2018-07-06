const JoyToken = artifacts.require('JoyToken');
const SubscriptionWithEther = artifacts.require('SubscriptionWithEther');
const SubscriptionWithJoyToken = artifacts.require('SubscriptionWithJoyToken');


module.exports = async (deployer) => {
	deployer.deploy(SubscriptionWithEther);

	deployer.deploy(JoyToken, { overwrite: false })
		.then(() =>
			deployer.deploy(SubscriptionWithJoyToken, JoyToken.address));
};
