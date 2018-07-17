const PlatformDeposit = artifacts.require('PlatformDeposit');
const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');


contract('PlatformDeposit', (accounts) => {
	const amount0 = 300000;
	const amount1 = 3000;
	const amount2 = 7000;
	const amount3 = 9000;
	const amount4 = 12000;

	let joyTokenInstance;
	let joyTokenERC223;
	let platformInstance;

	// create token, platform and distribute some tokens;
	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		joyTokenERC223 = await JoyTokenUpgraded.deployed();
		platformInstance = await PlatformDeposit.deployed();

		await joyTokenInstance.transfer(accounts[1], amount1, { from: accounts[0] });
		await joyTokenInstance.transfer(accounts[2], amount2, { from: accounts[0] });
		await joyTokenInstance.transfer(accounts[3], amount3, { from: accounts[0] });
		await joyTokenInstance.transfer(accounts[4], amount4, { from: accounts[0] });

		// allowances
		await joyTokenInstance.approve(joyTokenERC223.address, amount0, { from: accounts[0] });
		await joyTokenInstance.approve(joyTokenERC223.address, amount1, { from: accounts[1] });
		await joyTokenInstance.approve(joyTokenERC223.address, amount2, { from: accounts[2] });
		await joyTokenInstance.approve(joyTokenERC223.address, amount3, { from: accounts[3] });
		await joyTokenInstance.approve(joyTokenERC223.address, amount4, { from: accounts[4] });
	});

	it('Transfer_to_deposit', (done) => {
		joyTokenERC223.transfer(platformInstance.address, amount0, { from: accounts[0] })
			.then(() =>
				platformInstance.balanceOfPlayer.call(accounts[0]))
			.then((balance) => {
				assert.equal(balance.valueOf(), amount0, 'account[0] should have his tokens recorded in deposit.');
				done();
			});
	});

	it('Transfer_to_many', (done) => {
		Promise.all([
			joyTokenERC223.transfer(platformInstance.address, amount1, { from: accounts[1] }),
			joyTokenERC223.transfer(platformInstance.address, amount2, { from: accounts[2] }),
			joyTokenERC223.transfer(platformInstance.address, amount3, { from: accounts[3] }),
			joyTokenERC223.transfer(platformInstance.address, amount4, { from: accounts[4] })
		])
			.then(() =>
				Promise.all([
					platformInstance.balanceOfPlayer.call(accounts[1]),
					platformInstance.balanceOfPlayer.call(accounts[2]),
					platformInstance.balanceOfPlayer.call(accounts[3]),
					platformInstance.balanceOfPlayer.call(accounts[4])
				]))
			.then((balances) => {
				assert.equal(balances[1 - 1].valueOf(), amount1, 'account[1] should have his tokens in deposit.');
				assert.equal(balances[2 - 1].valueOf(), amount2, 'account[2] should have his tokens in deposit.');
				assert.equal(balances[3 - 1].valueOf(), amount3, 'account[3] should have his tokens in deposit.');
				assert.equal(balances[4 - 1].valueOf(), amount4, 'account[4] should have his tokens in deposit.');
				done();
			});
	});

	it('payOut_from_deposit', (done) => {
		let initialBalance;
		let initialPlatformBalance;
		joyTokenInstance.balanceOf.call(accounts[0])
			.then((balance) => {
				initialBalance = balance;
				return platformInstance.balanceOfPlayer.call(accounts[0]);
			})
			.then((platformBalance) => {
				initialPlatformBalance = platformBalance;
				return joyTokenERC223.transfer(platformInstance.address, amount0, { from: accounts[0] });
			})
			.then((result) => {
				assert.ok(result);
				return platformInstance.payOut(accounts[0], amount1, { from: accounts[0] });
			})
			// check both balances
			.then(() =>
				joyTokenInstance.balanceOf.call(accounts[0]))
			.then((balance) => {
				// compraring two bignumbers
				assert.equal(balance.cmp(initialBalance.minus(amount0).plus(amount1)), 0);
				return platformInstance.balanceOfPlayer.call(accounts[0]);
			})
			.then((balance) => {
				assert.equal(balance.cmp(initialPlatformBalance.plus(amount0).minus(amount1)), 0);
				done();
			});
	});

	it('fail_to_friend', (done) => {
		let acc2Initial;
		joyTokenInstance.balanceOf.call(accounts[3])
			.then((balance) => {
				acc2Initial = balance;
				return joyTokenInstance.transfer(platformInstance.address, amount0, { from: accounts[0] });
			})
			.then((result) => {
				assert.ok(result);
				// acc0 payout to acc3
				return platformInstance.payOut(accounts[3], amount1, { from: accounts[0] });
			})
			.then(() =>
				joyTokenInstance.balanceOf.call(accounts[3]))
			.then((balanceAfter) => {
				assert.equal(balanceAfter.cmp(acc2Initial.plus(amount1)), 0, 'account should have increased balance.');
				done();
			});
	});

	// try to payout more than was deposit, should fail
	it('fail_payOut', (done) => {
		let accDeposit;
		platformInstance.balanceOfPlayer.call(accounts[3])
			.then((balance) => {
				accDeposit = balance;
				return platformInstance.payOut(accounts[3], accDeposit.plus(amount1), { from: accounts[3] });
			})
			.catch((err) => {
				assert.include(
					err.message,
					'VM Exception while processing transaction: revert',
					'payOut more than was deposit, should be reverted.'
				);
				done();
			});
	});
});
