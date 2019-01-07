const MaliciousToken = artifacts.require('MaliciousToken');

module.exports = (deployer, network) => {
	if (['development', 'coverage'].includes(network)) {
		deployer.deploy(MaliciousToken, { overwrite: false });
	}
};
