require("babel-polyfill");
require('babel-register');

const config = require('./config.json');
const test_config = require('./test/config.json');

const { platformOwner, ropsten_host, ropsten_port } = config;
const { ganache_port, testrpc_port } = test_config;

module.exports = {
	solc: {
		optimizer: {
			enabled: true,
			runs: 200
		}
	},
	networks: {
		ropsten: {
			host: ropsten_host,
			port: ropsten_port,
			network_id: '3',
			from: platformOwner,
			gas: 4700000,
			gasPrice: 160000000000
		},
		development: {
			host: 'localhost',
			port: ganache_port,
			network_id: '*',
			gas: 6000000,
			gasPrice: 14000000000 // 14Gwei
		},
		coverage: {
			host: 'localhost',
			network_id: '*',
			port: testrpc_port,
			gas: 0xfffffffffff,
			gasPrice: 0x01
		}
	}
};
