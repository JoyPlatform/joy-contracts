const config = require('../config.json');
const testConfig = require('../test/config.json');

const JoyToken = artifacts.require('JoyToken');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');


module.exports = (deployer, network) => {
	let platformReserve;
	let gameDeveloper;

	if (['development', 'coverage'].includes(network)) {
		[, platformReserve, gameDeveloper] = testConfig.accounts;
	} else {
		({ platformReserve, gameDeveloper } = config);
	}

	deployer.deploy(JoyToken, { overwrite: false })
		.then(() =>
			deployer.deploy(GameDeposit, JoyToken.address, platformReserve))
		.then(() =>
			deployer.deploy(JoyGamePlatform, GameDeposit.address, gameDeveloper));
};
