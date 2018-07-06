const PlatformDeposit = artifacts.require('PlatformDeposit');
const JoyToken = artifacts.require('JoyToken');


contract('PlatformDeposit', (accounts) => {
	const amount0 = 300000;
	const amount1 = 3000;
	const amount2 = 7000;
	const amount3 = 9000;
	const amount4 = 12000;

	let joyTokenInstance;
	let platformInstance;

	// create token, platform and distribute some tokens;
	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		platformInstance = await PlatformDeposit.deployed();

		await joyTokenInstance.transfer(accounts[1], amount1, { from: accounts[0] });
		await joyTokenInstance.transfer(accounts[2], amount2, { from: accounts[0] });
		await joyTokenInstance.transfer(accounts[3], amount3, { from: accounts[0] });
		await joyTokenInstance.transfer(accounts[4], amount4, { from: accounts[0] });
	});

	it('Transfer_to_deposit', async () => {
		await joyTokenInstance.transfer(platformInstance.address, amount0, { from: accounts[0] });

		platformInstance.balanceOfPlayer.call(accounts[0])
			.then((balance) => {
				assert.equal(balance.valueOf(), amount0, 'account[0] should have his tokens recorded in deposit.');
			});
	});

	it('Transfer_to_many', async () => {
		Promise.all([
			joyTokenInstance.transfer(platformInstance.address, amount1, { from: accounts[1] }),
			joyTokenInstance.transfer(platformInstance.address, amount2, { from: accounts[2] }),
			joyTokenInstance.transfer(platformInstance.address, amount3, { from: accounts[3] }),
			joyTokenInstance.transfer(platformInstance.address, amount4, { from: accounts[4] })
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
			});
	});

	it('payOut_from_deposit', () =>
		new Promise(async (resolve) => {
			const initialBalance = await joyTokenInstance.balanceOf.call(accounts[0]);
			const initialPlatformBalance = await platformInstance.balanceOfPlayer.call(accounts[0]);

			await joyTokenInstance.transfer(platformInstance.address, amount0, { from: accounts[0] });

			await platformInstance.payOut(accounts[0], amount1, { from: accounts[0] });

			// check both balances
			joyTokenInstance.balanceOf.call(accounts[0])
				.then((balance) => {
					assert.equal(balance.valueOf(), ((initialBalance - amount0) + amount1));
					return platformInstance.balanceOfPlayer.call(accounts[0]);
				})
				.then((balance) => {
					assert.equal(balance.valueOf(), (initialPlatformBalance.toNumber() + amount0) - amount1);
					resolve();
				});
		}));

	it('fail_to_friend', async () => {
		const acc2Initial = (await joyTokenInstance.balanceOf.call(accounts[3])).toNumber();
		await joyTokenInstance.transfer(platformInstance.address, amount0, { from: accounts[0] });

		// acc0 payout to acc3
		await platformInstance.payOut(accounts[3], amount1, { from: accounts[0] });
		const acc2AfterTx = (await joyTokenInstance.balanceOf.call(accounts[3])).toNumber();
		assert.equal(acc2AfterTx, acc2Initial + amount1, 'account should have increased balance.');
	});

	// try to payout more than was deposit, should fail
	it('fail_payOut', () =>
		new Promise(async (resolve) => {
			const accDeposit = (await platformInstance.balanceOfPlayer.call(accounts[3])).toNumber();
			platformInstance.payOut(accounts[3], accDeposit + amount1, { from: accounts[3] })
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'payOut more than was deposit, should be reverted.'
					);
					resolve();
				});
		}));
});
