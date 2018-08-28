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

		let joyTokenInstance;
		let joyTokenERC223;

		const testAddress = accounts[1];
		const testAddress2 = accounts[2];
		const amount = 3734;

		// returns overloaded joyToken transfer function: transfer(address,uint256,bytes)
		function joyTransferOverloaded(joyTokenUpgraded) {
			const joyToken223ABI = joyTokenUpgraded.contract.abi;
			const JoyToken223Web3 = new web3.eth.Contract(joyToken223ABI, joyTokenERC223.address);
			return JoyToken223Web3.methods['transfer(address,uint256,bytes)'];
		}

		// create token, platform and distribute some tokens;
		beforeEach(async () => {
			joyTokenInstance = await JoyToken.deployed();
			joyTokenERC223 = await JoyTokenUpgraded.deployed();

			await joyTokenInstance.transfer(testAddress, amount, { from: accounts[0] });

			// allowances
			await joyTokenInstance.approve(joyTokenERC223.address, amount, { from: testAddress });
		});

		it('Simple_transfer', (done) => {
			joyTokenERC223.transfer(testAddress2, amount, { from: testAddress })
				.then(() => joyTokenInstance.balanceOf(testAddress2))
				.then((balance) => {
					assert.equal(balance.toNumber(), amount, 'balances should be equal');
					done();
				});
		});

		it('Transfer_failed', (done) => {
			// testAddress2 have no funds
			joyTokenERC223.transfer(testAddress, amount, { from: testAddress2 })
				.then(() => joyTokenInstance.balanceOf(testAddress2))
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Can not transfer without allowances'
					);
					done();
				});
		});

		it('Transfer_to_contract_failed', (done) => {
			// testAddress2 have no funds
			joyTokenERC223.transfer(joyTokenInstance.address, amount, { from: testAddress2 })
				.then(() => joyTokenInstance.balanceOf(testAddress2))
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Can not transfer without allowances'
					);
					done();
				});
		});

		it('Transfer_with_addtional_data', (done) => {
			const exampleData = 'test_data';

			joyTransferOverloaded(joyTokenERC223)(
				testAddress2,
				amount,
				web3.utils.asciiToHex(exampleData)
			).send({ from: testAddress })
				.then((result) => {
					assert.equal(web3.utils.toUtf8(result.events.ERC223Transfer.returnValues.data), exampleData);
					done();
				});
		});
	});
});
