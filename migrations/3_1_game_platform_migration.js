const config = require('../config.json');

const JoyToken = artifacts.require('JoyToken');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');


module.exports = (deployer) => {
	deployer.deploy(JoyToken, { overwrite: false })
		.then(() =>
			deployer.deploy(GameDeposit, JoyToken.address, config.platformReserve))
		.then(() =>
			deployer.deploy(JoyGamePlatform, GameDeposit.address, config.gameDeveloper));
};
