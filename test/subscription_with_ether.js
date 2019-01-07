const SubscriptionWithEther = artifacts.require('SubscriptionWithEther');
const Web3 = require('web3');


contract('Subscription_with_ether', (accounts) => {
	const web3 = new Web3();
	const { BN } = web3.utils;
	web3.setProvider(SubscriptionWithEther.web3.currentProvider);

	const defaultPrice = web3.utils.toWei('20', 'Gwei');
	const price2 = web3.utils.toWei('45', 'Gwei');

	let subscriptionInstance;
	beforeEach(async () => {
		subscriptionInstance = await SubscriptionWithEther.deployed();
	});

	it('Check_price', () =>
		new Promise((resolve) => {
			subscriptionInstance.subscriptionPrice.call()
				.then((price) => {
					assert.equal(price, defaultPrice);
					resolve();
				});
		}));

	// should throw exception
	it('Set_price_fail', () =>
		new Promise((resolve) => {
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
		new Promise((resolve) => {
			let owner;
			subscriptionInstance.owner.call()
				.then((ownerAddress) => {
					owner = ownerAddress;
					return subscriptionInstance.setSubscriptionPrice(price2, { from: owner });
				})
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

			subscriptionInstance.subscribe(timeToBuy, { from: accounts[3], value: totalPrice })
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

			subscriptionInstance.subscribe(timeToBuy, { from: accounts[3], value: totalPrice })
				.then((result) => {
					// event should be emited
					assert.equal(result.logs[0].event, 'newSubscription');
					const {
						buyer, price, timepoint, amountOfTime
					} = result.logs[0].args;

					assert.equal(buyer, accounts[3]);
					assert.equal(price.valueOf(), actualPrice.valueOf());
					assert.equal(amountOfTime, timeToBuy);

					// acceptable time differnece
					const lapse = 20000;
					assert.ok(timepoint.toNumber() >= timepointBefore - lapse);
					assert.ok(timepoint.toNumber() < timepointBefore + lapse);
					resolve();
				});
		}));

	it('Collected_funds', () =>
		new Promise(async (resolve) => {
			const actualPrice = await subscriptionInstance.subscriptionPrice.call();

			const collectedFundsBefore = await subscriptionInstance.collectedFunds.call();

			const timeToBuy = 400;
			const totalPrice = actualPrice * timeToBuy;

			subscriptionInstance.subscribe(timeToBuy, { from: accounts[3], value: totalPrice })
				.then((result) => {
					// event should be emited
					assert.equal(result.logs[0].event, 'newSubscription');
					return subscriptionInstance.collectedFunds.call();
				})
				.then((collectedFunds) => {
					assert.equal(collectedFunds.valueOf(), totalPrice + collectedFundsBefore.toNumber());
					resolve();
				});
		}));

	it('Payout_funds', () =>
		new Promise(async (resolve) => {
			const owner = await subscriptionInstance.owner.call();
			const ownerBalanceBefore = await web3.eth.getBalance(owner);

			const actualPrice = await subscriptionInstance.subscriptionPrice.call();
			const timeToBuy = 800000;
			const totalPrice = actualPrice * timeToBuy;

			subscriptionInstance.subscribe(timeToBuy, { from: accounts[3], value: totalPrice })
				.then((result) => {
					// event should be emited
					assert.equal(result.logs[0].event, 'newSubscription');
					return subscriptionInstance.collectedFunds.call();
				})
				.then(collectedFunds =>
					// payOut all collected funds
					subscriptionInstance.payOut(owner, collectedFunds, { from: owner }))
				.then(async () => {
					const collectedFundsLeft = await subscriptionInstance.collectedFunds.call();
					assert.equal(collectedFundsLeft.valueOf(), 0, 'Collected funds should be empty');
					const ownerBalance = await web3.eth.getBalance(owner);

					// assume that totalPrice is bigger than gas consumed with payOut tx
					assert.ok(
						(new BN(ownerBalance)).gt(new BN(ownerBalanceBefore)),
						'Can not be strict because of gas price'
					);
					resolve();
				});
		}));

	it('Payout_funds_to_friend', () =>
		new Promise(async (resolve) => {
			const owner = await subscriptionInstance.owner.call();
			const acc4BalanceBefore = await web3.eth.getBalance(accounts[4]);

			const actualPrice = await subscriptionInstance.subscriptionPrice.call();
			const timeToBuy = 600000;
			const totalPrice = actualPrice * timeToBuy;

			subscriptionInstance.subscribe(timeToBuy, { from: accounts[2], value: totalPrice })
				.then((result) => {
					// event should be emited
					assert.equal(result.logs[0].event, 'newSubscription');
					return subscriptionInstance.collectedFunds.call();
				})
				.then(collectedFunds =>
					// payOut all collected funds to account 4
					subscriptionInstance.payOut(accounts[4], collectedFunds, { from: owner }))
				.then(async () => {
					const collectedFundsLeft = await subscriptionInstance.collectedFunds.call();
					assert.equal(collectedFundsLeft.valueOf(), 0, 'Collected funds should be empty');
					const acc4Balance = await web3.eth.getBalance(accounts[4]);
					assert.equal(acc4Balance, Number(acc4BalanceBefore) + Number(totalPrice));
					resolve();
				});
		}));
});
