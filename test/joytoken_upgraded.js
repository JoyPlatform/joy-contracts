const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const Web3 = require('web3');

contract('JoyTokenUpgraded', () => {
	// checking basic functions
	let joyTokenDecimals;
	let joyTokenTotalSupply;

	it('JoyTokenUpgraded Name', () =>
		JoyTokenUpgraded.deployed()
			.then(instance => instance.name())
			.then(name =>
				assert.equal(name, 'JoyToken', `${name} is not a name of JoyToken`)));

	it('JoyTokenUpgraded Symbol', () =>
		JoyTokenUpgraded.deployed()
			.then(instance => instance.symbol())
			.then(symbol =>
				assert.equal(symbol, 'JOY', `${symbol} is not a symbol of JoyToken`)));

	it('JoyTokenUpgraded Decimal', () =>
		JoyTokenUpgraded.deployed()
			.then(instance => instance.decimals())
			.then((decimals) => {
				joyTokenDecimals = decimals;
				assert.equal(decimals, 18, 'Decimal of JoyToken should be equal 10');
			}));

	it('Total Supply of JoyTokenUpgraded', () =>
		JoyTokenUpgraded.deployed()
			.then(instance => instance.totalSupply.call())
			.then((totalSupply) => {
				joyTokenTotalSupply = totalSupply.valueOf();
				assert.equal(
					joyTokenTotalSupply,
					700000000 * (10 ** joyTokenDecimals),
					`${joyTokenTotalSupply} is not a total supply`
				);
			}));


	contract('JoyToken_OverloadedTransfer', (accounts) => {
		const web3 = new Web3();

		web3.setProvider(JoyTokenUpgraded.web3.currentProvider);

		it('Initialy the owner of contract have full totalSupply', (done) => {
			JoyToken.deployed()
				.then(instance => instance.balanceOf.call(accounts[0]))
				.then((balance) => {
					assert.equal(balance.valueOf(), joyTokenTotalSupply, 'account[0] have wrong balance.');
					done();
				});
		});

		it('Transfer with addtional data', (done) => {
			const amount = 46;
			const exampleData = 'test_data';

			let JoyTokenERC20;
			JoyToken.deployed()
				.then((instance) => {
					JoyTokenERC20 = instance;
					return JoyTokenUpgraded.deployed();
				})
				.then(async (instance) => {
					const joyTokenABI = instance.contract.abi;
					const joyTokenAddress = instance.contract.address;

					await JoyTokenERC20.approve(joyTokenAddress, amount);
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
					assert.equal(web3.utils.toUtf8(result.events.ERC223Transfer.returnValues.data), exampleData);
					done();
				});
		});
	});
});
