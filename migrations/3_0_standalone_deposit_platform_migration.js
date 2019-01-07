const JoyToken = artifacts.require('JoyToken');
const PlatformDeposit = artifacts.require('PlatformDeposit');


module.exports = (deployer) => {
	deployer.deploy(JoyToken, { overwrite: false })
		.then(() =>
			deployer.deploy(PlatformDeposit, JoyToken.address));
};
