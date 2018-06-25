
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
		}
	}
};
