const config = require('../config.json');

const JoyToken = artifacts.require('JoyToken');
const PlatformDeposit = artifacts.require('PlatformDeposit');
const JoyGameDemo = artifacts.require('JoyGameDemo');


module.exports = (deployer) => {
	deployer.deploy(JoyToken, { overwrite: false })
		.then(() =>
			deployer.deploy(PlatformDeposit, JoyToken.address, config.platformReserve))
		.then(() =>
			deployer.deploy(JoyGameDemo, PlatformDeposit.address, config.gameDeveloper));
};
