const config = require('../config.json');

const JoyToken = artifacts.require('JoyToken');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGameDemo = artifacts.require('JoyGameDemo');


module.exports = (deployer) => {
	deployer.deploy(JoyToken, { overwrite: false })
		.then(() =>
			deployer.deploy(GameDeposit, JoyToken.address, config.platformReserve))
		.then(() =>
			deployer.deploy(JoyGameDemo, GameDeposit.address, config.gameDeveloper));
};
