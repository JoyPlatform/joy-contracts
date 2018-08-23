const PlatformDeposit = artifacts.require('PlatformDeposit');
const GameDeposit = artifacts.require('GameDeposit');
const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const MaliciousToken = artifacts.require('MaliciousToken');


function runTests(depositType) {
	contract('Deposit_Tests', (accounts) => {
		const amount0 = 300000;
		const amount1 = 3000;
		const amount2 = 7000;
		const amount3 = 9000;
		const amount4 = 12000;

		let joyTokenInstance;
		let joyTokenERC223;
		let depositInstance;

		let maliciousTokenInstance;

		// create token, platform and distribute some tokens;
		beforeEach(async () => {
			joyTokenInstance = await JoyToken.deployed();
			joyTokenERC223 = await JoyTokenUpgraded.deployed();

			if (depositType === 'PlatformDeposit_standalone') {
				depositInstance = await PlatformDeposit.deployed();
			} else if (depositType === 'GameDeposit') {
				depositInstance = await GameDeposit.deployed();
			}	else {
				assert.ok(false, `Bad deposit type: ${depositType}`);
			}

			maliciousTokenInstance = await MaliciousToken.deployed();

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

		contract(depositType, () => {
			it('Transfer_to_deposit', (done) => {
				joyTokenERC223.transfer(depositInstance.address, amount0, { from: accounts[0] })
					.then(() =>
						depositInstance.balanceOfPlayer.call(accounts[0]))
					.then((balance) => {
						assert.equal(
							balance.valueOf(), amount0,
							'account[0] should have his tokens recorded in deposit.'
						);
						done();
					});
			});
			it('Transfer_to_many', (done) => {
				Promise.all([
					joyTokenERC223.transfer(depositInstance.address, amount1, { from: accounts[1] }),
					joyTokenERC223.transfer(depositInstance.address, amount2, { from: accounts[2] }),
					joyTokenERC223.transfer(depositInstance.address, amount3, { from: accounts[3] }),
					joyTokenERC223.transfer(depositInstance.address, amount4, { from: accounts[4] })
				])
					.then(() =>
						Promise.all([
							depositInstance.balanceOfPlayer.call(accounts[1]),
							depositInstance.balanceOfPlayer.call(accounts[2]),
							depositInstance.balanceOfPlayer.call(accounts[3]),
							depositInstance.balanceOfPlayer.call(accounts[4])
						]))
					.then((balances) => {
						assert.equal(
							balances[1 - 1].valueOf(), amount1,
							'account[1] should have his tokens in deposit.'
						);
						assert.equal(
							balances[2 - 1].valueOf(), amount2,
							'account[2] should have his tokens in deposit.'
						);
						assert.equal(
							balances[3 - 1].valueOf(), amount3,
							'account[3] should have his tokens in deposit.'
						);
						assert.equal(
							balances[4 - 1].valueOf(), amount4,
							'account[4] should have his tokens in deposit.'
						);
						done();
					});
			});
			it('payOut_from_deposit', (done) => {
				let initialBalance;
				let initialPlatformBalance;
				joyTokenInstance.balanceOf.call(accounts[0])
					.then((balance) => {
						initialBalance = balance;
						return depositInstance.balanceOfPlayer.call(accounts[0]);
					})
					.then((platformBalance) => {
						initialPlatformBalance = platformBalance;
						return joyTokenERC223.transfer(depositInstance.address, amount0, { from: accounts[0] });
					})
					.then((result) => {
						assert.ok(result);
						return depositInstance.payOut(accounts[0], amount1, { from: accounts[0] });
					})
					// check both balances
					.then(() =>
						joyTokenInstance.balanceOf.call(accounts[0]))
					.then((balance) => {
						// compraring two bignumbers
						assert.equal(balance.cmp(initialBalance.sub(amount0).add(amount1)), 0);
						return depositInstance.balanceOfPlayer.call(accounts[0]);
					})
					.then((balance) => {
						assert.equal(balance.cmp(initialPlatformBalance.add(amount0).sub(amount1)), 0);
						done();
					});
			});

			it('fail_to_friend', (done) => {
				let acc2Initial;
				joyTokenInstance.balanceOf.call(accounts[3])
					.then((balance) => {
						acc2Initial = balance;
						return joyTokenInstance.transfer(depositInstance.address, amount0, { from: accounts[0] });
					})
					.then((result) => {
						assert.ok(result);
						// acc0 payout to acc3
						return depositInstance.payOut(accounts[3], amount1, { from: accounts[0] });
					})
					.then(() =>
						joyTokenInstance.balanceOf.call(accounts[3]))
					.then((balanceAfter) => {
						assert.equal(
							balanceAfter.cmp(acc2Initial.add(amount1)), 0,
							'account should have increased balance.'
						);
						done();
					});
			});

			// try to payout more than was deposit, should fail
			it('fail_payOut', (done) => {
				depositInstance.balanceOfPlayer.call(accounts[3])
					.then(balance => depositInstance.payOut(accounts[3], balance.add(amount1), { from: accounts[3] }))
					.catch((err) => {
						assert.include(
							err.message,
							'VM Exception while processing transaction: revert',
							'payOut more than was deposit, should be reverted.'
						);
						done();
					});
			});

			// try to payout to another contract, should fail
			it('payOut_to_contract', (done) => {
				depositInstance.balanceOfPlayer.call(accounts[3])
					.then(balance => depositInstance.payOut(
						maliciousTokenInstance.address,
						balance, { from: accounts[3] }
					))
					.catch((err) => {
						assert.include(
							err.message,
							'VM Exception while processing transaction: revert',
							'sending unsupported token, should be reverted.'
						);
						done();
					});
			});

			// try to send unsupported token to the deposit, should fail
			it('send_unsupported_token', (done) => {
				maliciousTokenInstance.transferToContract(accounts[3], amount1)
					.catch((err) => {
						assert.include(
							err.message,
							'VM Exception while processing transaction: revert',
							'sending unsupported token, should be reverted.'
						);
						done();
					});
			});
		});
	});
}

runTests('PlatformDeposit_standalone');
runTests('GameDeposit');
