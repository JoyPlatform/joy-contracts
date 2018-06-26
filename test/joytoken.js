const JoyToken = artifacts.require('JoyToken');


contract('JoyToken', (accounts) => {
	let joyTokenDecimals;
	let joyTokenTotalSupply;

	it('JoyToken Name', () =>
		JoyToken.deployed()
			.then(instance => instance.name())
			.then(name =>
				assert.equal(name, 'JoyToken', `${name} is not a name of JoyToken`)));

	it('JoyToken Symbol', () =>
		JoyToken.deployed()
			.then(instance => instance.symbol())
			.then(symbol =>
				assert.equal(symbol, 'JOY', `${symbol} is not a symbol of JoyToken`)));

	it('JoyToken Decimal', () =>
		JoyToken.deployed()
			.then(instance => instance.decimals())
			.then((decimals) => {
				joyTokenDecimals = decimals;
				assert.equal(decimals, 10, 'Decimal of JoyToken should be equal 10');
			}));

	it('Total Supply of JoyToken', () =>
		JoyToken.deployed()
			.then(instance => instance.totalSupply.call())
			.then((totalSupply) => {
				joyTokenTotalSupply = totalSupply.valueOf();
				assert.equal(
					joyTokenTotalSupply,
					700000000 * (10 ** joyTokenDecimals),
					`${joyTokenTotalSupply} is not a total supply`
				);
			}));

	it('Initialy the owner of contract have full totalSupply', () =>
		JoyToken.deployed()
			.then(instance => instance.balanceOf.call(accounts[0]))
			.then(balance =>
				assert.equal(balance.valueOf(), joyTokenTotalSupply, 'account[0] have wrong balance.')));

	contract('Transfers Tests', () => {
		it('Transfers - series of few transactions', (done) => {
			const amount1 = 3000;
			const amount2 = 50000;	// bigger than amount1
			const amount3 = 170000;	// bigger than amount2

			let JoyTokenInstance;
			JoyToken.deployed()
				.then((instance) => {
					JoyTokenInstance = instance;
					// amount1 token transfer from coinbase acc0 to acc1
					return JoyTokenInstance.transfer(accounts[1], amount1, { from: accounts[0] });
				})
				.then(async () => {
					// If this callback is called, the transaction was successfully processed.
					const acc0Balance = await JoyTokenInstance.balanceOf.call(accounts[0]);
					const acc1Balance = await JoyTokenInstance.balanceOf.call(accounts[1]);

					assert.equal(acc0Balance, (joyTokenTotalSupply - amount1), `acc0Balance: ${acc0Balance}`);
					assert.equal(acc1Balance, amount1, `acc1Balance: ${acc1Balance}`);

					// amount2 token transfer from coinbase acc0 to acc2
					return JoyTokenInstance.transfer(accounts[2], amount2, { from: accounts[0] });
				})
				.then(async () => {
					// If this callback is called, the transaction was successfully processed.
					const acc0Balance = await JoyTokenInstance.balanceOf.call(accounts[0]);
					const acc1Balance = await JoyTokenInstance.balanceOf.call(accounts[1]);
					const acc2Balance = await JoyTokenInstance.balanceOf.call(accounts[2]);

					assert.equal(acc0Balance, (joyTokenTotalSupply - (amount1 + amount2)));
					assert.equal(acc1Balance, amount1);
					assert.equal(acc2Balance, amount2);

					// amount3 token transfer from coinbase acc0 to acc3
					return JoyTokenInstance.transfer(accounts[3], amount3, { from: accounts[0] });
				})
				.then(async () => {
					// If this callback is called, the transaction was successfully processed.
					const acc0Balance = await JoyTokenInstance.balanceOf.call(accounts[0]);
					const acc1Balance = await JoyTokenInstance.balanceOf.call(accounts[1]);
					const acc2Balance = await JoyTokenInstance.balanceOf.call(accounts[2]);
					const acc3Balance = await JoyTokenInstance.balanceOf.call(accounts[3]);

					assert.equal(acc0Balance, (joyTokenTotalSupply - (amount1 + amount2 + amount3)));
					assert.equal(acc1Balance, amount1);
					assert.equal(acc2Balance, amount2);
					assert.equal(acc3Balance, amount3);

					// amount2 token transfer from acc3 back to acc1
					return JoyTokenInstance.transfer(accounts[1], amount2, { from: accounts[3] });
				})
				.then(async () => {
					// If this callback is called, the transaction was successfully processed.
					const acc0Balance = await JoyTokenInstance.balanceOf.call(accounts[0]);
					const acc1Balance = await JoyTokenInstance.balanceOf.call(accounts[1]);
					const acc2Balance = await JoyTokenInstance.balanceOf.call(accounts[2]);
					const acc3Balance = await JoyTokenInstance.balanceOf.call(accounts[3]);

					assert.equal(acc0Balance, (joyTokenTotalSupply - (amount1 + amount2 + amount3)));
					assert.equal(acc1Balance, (amount1 + amount2));
					assert.equal(acc2Balance, amount2);
					assert.equal(acc3Balance, (amount3 - amount2));

					// amount2 token transfer from acc2 back to acc1
					return JoyTokenInstance.transfer(accounts[1], amount2, { from: accounts[2] });
				})
				.then(async () => {
					// If this callback is called, the transaction was successfully processed.
					const acc0Balance = await JoyTokenInstance.balanceOf.call(accounts[0]);
					const acc1Balance = await JoyTokenInstance.balanceOf.call(accounts[1]);
					const acc2Balance = await JoyTokenInstance.balanceOf.call(accounts[2]);
					const acc3Balance = await JoyTokenInstance.balanceOf.call(accounts[3]);

					assert.equal(acc0Balance, (joyTokenTotalSupply - (amount1 + amount2 + amount3)));
					assert.equal(acc1Balance, (amount1 + (2 * amount2)));
					assert.equal(acc2Balance, 0);
					assert.equal(acc3Balance, (amount3 - amount2));

					// amount2 token transfer from acc1 back to coinbase acc1
					return JoyTokenInstance.transfer(accounts[0], amount2, { from: accounts[1] });
				})
				.then(async () => {
					// If this callback is called, the transaction was successfully processed.
					const acc0Balance = await JoyTokenInstance.balanceOf.call(accounts[0]);
					const acc1Balance = await JoyTokenInstance.balanceOf.call(accounts[1]);
					const acc2Balance = await JoyTokenInstance.balanceOf.call(accounts[2]);
					const acc3Balance = await JoyTokenInstance.balanceOf.call(accounts[3]);

					assert.equal(acc0Balance, (joyTokenTotalSupply - (amount1 + amount3)));
					assert.equal(acc1Balance, (amount1 + amount2));
					assert.equal(acc2Balance, 0);
					assert.equal(acc3Balance, (amount3 - amount2));
					done();
				})
				.catch((err) => {
					// There was an error!
					assert(false, `Failed, catch in TransfersSeries test, err: ${err.message}`);
				});
		});

		it('Transfers failed - to big amount', (done) => {
			const toBigAmount = 2 * joyTokenTotalSupply;

			JoyToken.deployed()
				.then(instance => instance.transfer(accounts[2], toBigAmount, { from: accounts[0] }))
				.then(assert.fail)
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'to big transfer should throw revert exception.'
					);
					done();
				});
		});

		it('Transfers failed - from empty', (done) => {
			const amount = 2;

			JoyToken.deployed()
				.then(instance => instance.transfer(accounts[1], amount, { from: accounts[2] }))
				.then(assert.fail)
				.catch((err) => {
					assert.include(
						err.message,
						'VM Exception while processing transaction: revert',
						'to big transfer should throw revert exception.'
					);
					done();
				});
		});
	});
});
