
module.exports = {
	solc: {
		optimizer: {
			enabled: true,
			runs: 200
		}
	},
	networks: {
		development: {
			host: 'localhost',
			port: 8545,
			network_id: '*',
			gas: 6000000,
			gasPrice: 14000000000 // 14Gwei
		},
		coverage: {
			host: 'localhost',
			network_id: '*',
			port: 8555,
			gas: 0xfffffffffff,
			gasPrice: 0x01
		}
	}
};
