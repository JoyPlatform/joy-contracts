const JoyToken = artifacts.require('JoyToken');

module.exports = (deployer) => {
	deployer.deploy(JoyToken);
};
