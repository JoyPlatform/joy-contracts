const JoyToken = artifacts.require('JoyToken');
const SubscriptionWithJoyToken = artifacts.require('SubscriptionWithJoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const Web3 = require('web3');


contract('Subscription_with_joyToken', (accounts) => {
	const web3 = new Web3();
	web3.setProvider(JoyToken.web3.currentProvider);

	const gasLimit = 200000;
	const defaultPrice = 100;	// base units of JoyToken
	const price2 = 120;
	const testTokenAmount = 1000000;

	let joyTokenInstance;
	let joyTokenERC223;

	// truffle currently have no mechanism to interact with overloaded methods, and we need transfer with data
	// instead of using truffle-contract, we need to create contract object directly through web3
	let joyTokenTransfer;

	let subscriptionInstance;

	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		joyTokenERC223 = await JoyTokenUpgraded.deployed();
		const joyToken223ABI = joyTokenERC223.contract.abi;
		const JoyToken223Web3 = new web3.eth.Contract(joyToken223ABI, joyTokenERC223.address, { gas: gasLimit });
		joyTokenTransfer = JoyToken223Web3.methods['transfer(address,uint256,bytes)'];

		// send some tokens to acc3
		await joyTokenInstance.transfer(accounts[3], testTokenAmount);

		// allowances because base token is erc20
		await joyTokenInstance.approve(joyTokenERC223.address, testTokenAmount, { from: accounts[0] });
		await joyTokenInstance.approve(joyTokenERC223.address, testTokenAmount, { from: accounts[3] });

		subscriptionInstance = await SubscriptionWithJoyToken.deployed();
	});

	it('Check_price', () =>
		new Promise(async (resolve) => {
			subscriptionInstance.subscriptionPrice.call()
				.then((price) => {
					assert.equal(price.valueOf(), defaultPrice);
					resolve();
				});
		}));

	// should throw exception
	it('Set_price_fail', () =>
		new Promise(async (resolve) => {
			subscriptionInstance.setSubscriptionPrice(price2, { from: accounts[1] })
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Only then owner can change subscriptionPrice.'
					);
					resolve();
				});
		}));

	it('Set_price', () =>
		new Promise(async (resolve) => {
			const owner = await subscriptionInstance.owner.call();
			subscriptionInstance.setSubscriptionPrice(price2, { from: owner })
				.then(async () => {
					const newPrice = await subscriptionInstance.subscriptionPrice.call();
					assert.equal(price2, newPrice);
					resolve();
				});
		}));

	it('Buy_subscription_fail', () =>
		new Promise(async (resolve) => {
			const badPrice = 123123123;
			const actualPrice = await subscriptionInstance.subscriptionPrice.call();

			// Prices should be wrong for this test
			assert.ok(badPrice !== actualPrice.toNumber());

			const timeToBuy = 600;
			const totalPrice = badPrice * timeToBuy;

			// prepare bytes from number
			const timeToBuyBytes = web3.utils.asciiToHex(timeToBuy.toString(16));

			joyTokenTransfer(
				subscriptionInstance.address,
				totalPrice,
				timeToBuyBytes
			).send({ from: accounts[3] })
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Transaction with bad price should be reverted.'
					);
					resolve();
				});
		}));

	it('Buy_subscription', () =>
		new Promise(async (resolve) => {
			const actualPrice = await subscriptionInstance.subscriptionPrice.call();
			const timeToBuy = 600;
			const totalPrice = actualPrice * timeToBuy;
			const timepointBefore = (new Date()).getTime() / 1000;

			// prepare bytes from number
			const timeToBuyBytes = web3.utils.asciiToHex(timeToBuy.toString(16));

			// transfer to contract
			joyTokenTransfer(
				subscriptionInstance.address,
				totalPrice,
				timeToBuyBytes
			).send({ from: accounts[3] })
				.then(async () => {
					const subscribeInfo = await subscriptionInstance.allSubscriptions.call(accounts[3]);
					const timepoint = subscribeInfo[0].valueOf();
					const amountOfTime = subscribeInfo[1].valueOf();

					assert.equal(amountOfTime, timeToBuy);

					// acceptable time differnece
					const lapse = 20000;
					assert.ok(timepoint >= timepointBefore - lapse);
					assert.ok(timepoint < timepointBefore + lapse);
					resolve();
				});
		}));

	it('Collected_funds', () =>
		new Promise(async (resolve) => {
			const actualPrice = await subscriptionInstance.subscriptionPrice.call();

			const collectedFundsBefore = await subscriptionInstance.collectedFunds.call();

			const timeToBuy = 400;
			const totalPrice = actualPrice * timeToBuy;

			// prepare bytes from number
			const timeToBuyBytes = web3.utils.asciiToHex(timeToBuy.toString(16));
			// transfer to contract
			joyTokenTransfer(
				subscriptionInstance.address,
				totalPrice,
				timeToBuyBytes
			).send({ from: accounts[3] })
				.then(() =>
					// event name is hidden because we are using plain web3, not truffle-contract
					subscriptionInstance.collectedFunds.call())
				.then((collectedFunds) => {
					assert.equal(collectedFunds.valueOf(), totalPrice + collectedFundsBefore.toNumber());
					resolve();
				});
		}));

	it('Payout_funds', () =>
		new Promise(async (resolve) => {
			const owner = await subscriptionInstance.owner.call();
			const ownerBalanceBefore = await joyTokenInstance.balanceOf(owner);
			const collectedFundsBefore = await subscriptionInstance.collectedFunds.call();

			const actualPrice = await subscriptionInstance.subscriptionPrice.call();
			const timeToBuy = 800;
			const totalPrice = actualPrice * timeToBuy;

			// prepare bytes from number
			const timeToBuyBytes = web3.utils.asciiToHex(timeToBuy.toString(16));
			// transfer to contract
			joyTokenTransfer(
				subscriptionInstance.address,
				totalPrice,
				timeToBuyBytes
			).send({ from: accounts[3] })
				.then(() =>
					subscriptionInstance.collectedFunds.call())
				.then(collectedFunds =>
					// payOut all collected funds
					subscriptionInstance.payOut(owner, collectedFunds.toNumber(), { from: owner }))
				.then(async () => {
					const collectedFundsLeft = await subscriptionInstance.collectedFunds.call();
					assert.equal(collectedFundsLeft.valueOf(), 0, 'Collected funds should be empty');
					const ownerBalance = await joyTokenInstance.balanceOf(owner);

					assert.equal(
						ownerBalance.valueOf(),
						ownerBalanceBefore.toNumber() + collectedFundsBefore.toNumber() + totalPrice
					);
					resolve();
				});
		}));

	it('Payout_funds_to_friend', () =>
		new Promise(async (resolve) => {
			const owner = await subscriptionInstance.owner.call();
			const acc4BalanceBefore = await joyTokenInstance.balanceOf(accounts[4]);

			const actualPrice = await subscriptionInstance.subscriptionPrice.call();
			const timeToBuy = 6000;
			const totalPrice = actualPrice * timeToBuy;

			// prepare bytes from number
			const timeToBuyBytes = web3.utils.asciiToHex(timeToBuy.toString(16));

			// transfer to contract
			joyTokenTransfer(
				subscriptionInstance.address,
				totalPrice,
				timeToBuyBytes
			).send({ from: accounts[3] })
				.then(() =>
					subscriptionInstance.collectedFunds.call())
				.then(collectedFunds =>
					// payOut all collected funds to account4
					subscriptionInstance.payOut(accounts[4], collectedFunds.toNumber(), { from: owner }))
				.then(async () => {
					const collectedFundsLeft = await subscriptionInstance.collectedFunds.call();
					assert.equal(collectedFundsLeft.valueOf(), 0, 'Collected funds should be empty');

					const acc4Balance = await joyTokenInstance.balanceOf(accounts[4]);
					assert.equal(acc4Balance.valueOf(), acc4BalanceBefore.toNumber() + totalPrice);
					resolve();
				});
		}));
});
