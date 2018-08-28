const JoyToken = artifacts.require('JoyToken');
const SubscriptionWithJoyToken = artifacts.require('SubscriptionWithJoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const MaliciousToken = artifacts.require('MaliciousToken');
const Web3 = require('web3');


function solidityBytes(num) {
	let byteNum;
	const hexNum = num.toString(16);
	if (hexNum.length % 2) {
		byteNum = `0x0${hexNum}`;
	} else {
		byteNum = `0x${hexNum}`;
	}
	return byteNum;
}

contract('Subscription_with_joyToken', (accounts) => {
	const web3 = new Web3();
	const { BN } = web3.utils;
	web3.setProvider(JoyToken.web3.currentProvider);

	const gasLimit = 200000;
	const defaultPrice = 100;	// base units of JoyToken
	const price2 = 120;
	const testTokenAmount = 10000000000;

	let joyTokenInstance;
	let joyTokenERC223;
	let maliciousTokenInstance;

	// truffle currently have no mechanism to interact with overloaded methods, and we need transfer with data
	// instead of using truffle-contract, we need to create contract object directly through web3
	let joyTokenTransfer;
	let subscriptionInstance;
	let owner;
	const testSubscriber = accounts[3];

	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		joyTokenERC223 = await JoyTokenUpgraded.deployed();
		const joyToken223ABI = joyTokenERC223.contract.abi;
		const JoyToken223Web3 = new web3.eth.Contract(joyToken223ABI, joyTokenERC223.address, { gas: gasLimit });
		joyTokenTransfer = JoyToken223Web3.methods['transfer(address,uint256,bytes)'];

		// send some tokens to acc3
		await joyTokenInstance.transfer(testSubscriber, testTokenAmount);

		// allowances because base token is erc20
		await joyTokenInstance.approve(joyTokenERC223.address, testTokenAmount, { from: accounts[0] });
		await joyTokenInstance.approve(joyTokenERC223.address, testTokenAmount, { from: testSubscriber });

		subscriptionInstance = await SubscriptionWithJoyToken.deployed();
		owner = await subscriptionInstance.owner.call();

		maliciousTokenInstance = await MaliciousToken.deployed();
	});

	function buySubscription(time) {
		return subscriptionInstance.subscriptionPrice.call()
			.then((actualPrice) => {
				const totalPrice = actualPrice * time;

				// transfer to contract
				return joyTokenTransfer(
					subscriptionInstance.address,
					totalPrice,
					solidityBytes(time)
				).send({ from: testSubscriber });
			});
	}

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
			subscriptionInstance.setSubscriptionPrice(price2, { from: testSubscriber })
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

			joyTokenTransfer(
				subscriptionInstance.address,
				totalPrice,
				solidityBytes(timeToBuy)
			).send({ from: testSubscriber })
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Transaction with bad price should be reverted.'
					);
					resolve();
				});
		}));

	it('Buy_subscription_too_many_bytes', () =>
		new Promise(async (resolve) => {
			const tooBig = '0x134078079299425970995740249982058461274793658205923933777235'
				+ '614437217640300735469768018742981669034276900318581864860508537538828119'
				+ '465699464336400966084097';

			// transfer to contract
			joyTokenTransfer(
				subscriptionInstance.address,
				'0',	// irrelevant
				tooBig
			).send({ from: accounts[3] })
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Transactions with bytes.lenght > 64 are not allowed.'
					);
					resolve();
				});
		}));

	// trying to buy subscription with non supported token, should be reverted.
	it('Buy_subscription_bad_token', () =>
		new Promise(async (resolve) => {
			const totalPrice = 5000;

			maliciousTokenInstance.transferToContract(
				subscriptionInstance.address,
				totalPrice, { from: owner }
			)
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Subscription with bad token should be reverted. (prevents tokens lost)'
					);
					resolve();
				});
		}));

	it('Buy_subscription', () =>
		new Promise(async (resolve) => {
			const timeToBuy = 11259375; // abcdef in hex
			const timepointBefore = (new Date()).getTime() / 1000;

			buySubscription(timeToBuy)
				.then(async () => {
					const subscribeInfo = await subscriptionInstance.allSubscriptions.call(testSubscriber);
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
			const timeToBuy = 1193040; // 123450 in hex
			const totalPrice = actualPrice * timeToBuy;

			buySubscription(timeToBuy)
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
			const ownerBalanceBefore = await joyTokenInstance.balanceOf(owner);
			const collectedFundsBefore = await subscriptionInstance.collectedFunds.call();

			const actualPrice = await subscriptionInstance.subscriptionPrice.call();
			const timeToBuy = 10926025; // a6b7c9 in hex
			const totalPrice = actualPrice * timeToBuy;

			joyTokenTransfer(
				subscriptionInstance.address,
				totalPrice,
				solidityBytes(timeToBuy)
			).send({ from: testSubscriber })
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
			const ownerFriend = accounts[5];
			const friendBalanceBefore = await joyTokenInstance.balanceOf(ownerFriend);

			const actualPrice = await subscriptionInstance.subscriptionPrice.call();
			const timeToBuy = 41097; // a089 in hex
			const totalPrice = actualPrice * timeToBuy;

			buySubscription(timeToBuy)
				.then(() =>
					subscriptionInstance.collectedFunds.call())
				.then(collectedFunds =>
					// payOut all collected funds to friend
					subscriptionInstance.payOut(ownerFriend, collectedFunds.toNumber(), { from: owner }))
				.then(async () => {
					const collectedFundsLeft = await subscriptionInstance.collectedFunds.call();
					assert.equal(collectedFundsLeft.valueOf(), 0, 'Collected funds should be empty');

					const friendBalance = await joyTokenInstance.balanceOf(ownerFriend);

					assert.equal(friendBalance.valueOf(), friendBalanceBefore.toNumber() + totalPrice);
					resolve();
				});
		}));

	// try to payout more than collected
	it('Failed_Payout', () =>
		new Promise(async (resolve) => {
			const timeToBuy = 10926025; // a6b7c9 in hex

			buySubscription(timeToBuy)
				.then(() =>
					subscriptionInstance.collectedFunds.call())
				.then(collectedFunds =>
					// payOut all collected funds
					subscriptionInstance.payOut(owner, (collectedFunds.mul(new BN('2'))).toNumber(), { from: owner }))
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'Can not payout more funds than are already collected.'
					);
					resolve();
				});
		}));
});
