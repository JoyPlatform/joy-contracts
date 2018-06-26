const JoyToken = artifacts.require('JoyToken');
const Web3 = require('web3');


contract('JoyToken_OverloadedTransfer', (accounts) => {
	const web3 = new Web3();

	web3.setProvider(JoyToken.web3.currentProvider);

	it('Transfer with addtional data', (done) => {
		const amount = 46;
		const exampleData = 'test_data';
		JoyToken.deployed()
			.then((instance) => {
				const joyTokenABI = instance.contract.abi;
				const joyTokenAddress = instance.contract.address;

				// truffle currently have no mechanism to interact with overloaded methods
				// instead of using truffle-contract, we need to create contract object directly through web3
				const JoyTokenWeb3 = new web3.eth.Contract(joyTokenABI, joyTokenAddress);
				return JoyTokenWeb3.methods['transfer(address,uint256,bytes)'](
					accounts[1],
					amount,
					web3.utils.asciiToHex(exampleData)
				).send({ from: accounts[0] });
			})
			.then((result) => {
				if (web3.utils.toUtf8(result.events.ERC223Transfer.returnValues.data) === exampleData) {
					done();
				}
			});
	});
});
