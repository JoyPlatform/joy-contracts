const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');


module.exports = (deployer) => {
	deployer.deploy(JoyToken, { overwrite: false })
		.then(() =>
			deployer.deploy(JoyTokenUpgraded, JoyToken.address));
};
