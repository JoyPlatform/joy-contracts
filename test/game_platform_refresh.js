/* eslint-disable func-names */
const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');
const Web3 = require('web3');


contract('GamePlatform_Events', (accounts) => {
	const web3 = new Web3();
	const { BN } = web3.utils;

	web3.setProvider(JoyTokenUpgraded.web3.currentProvider);

	const emptyData = '0x';

	// We can do this because JoyToken have same number of decimal places
	const testAmount = web3.utils.toWei('4', 'ether');

	// for big number operations
	const halfOfTestAmount = (new BN(testAmount)).div(new BN('2'));

	let joyTokenInstance;
	let joyTokenERC223;
	let joyGameInstance;
	let depositInstance;

	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		joyTokenERC223 = await JoyTokenUpgraded.deployed();

		depositInstance = await GameDeposit.deployed();
		joyGameInstance = await JoyGamePlatform.deployed();

		await joyTokenInstance.transfer(accounts[3], testAmount, { from: accounts[0] });

		// allowances
		await joyTokenInstance.approve(joyTokenERC223.address, testAmount, { from: accounts[3] });
	});

	it('NewGameSession_Event', (done) => {
		const event = joyGameInstance.allEvents();
		const newGameSessionHandler = (error, events) => {
			if (events.event === 'NewGameSession') {
				// found exac event!
				assert.equal(events.args.player, accounts[3]);
				assert.ok(events.args.start_balance.eq(halfOfTestAmount));
				event.stopWatching();
				done();
			}
		};

		// transfer to game half of testAmount
		joyTokenERC223.transferToGame(
			depositInstance.address,
			joyGameInstance.address,
			halfOfTestAmount.toString(), emptyData, { from: accounts[3] }
		)
			.then(() => {
				event.watch(newGameSessionHandler);
			});
	});

	it('RefreshGameSession_Event', (done) => {
		const event = joyGameInstance.allEvents();
		const refreshGameSessionHandler = (error, events) => {
			if (events.event === 'RefreshGameSession') {
				// found exac event!
				assert.equal(events.args.player, accounts[3]);
				assert.ok(events.args.increased_value.eq(new BN(halfOfTestAmount)));

				event.stopWatching();

				depositInstance.playerLockedFunds(accounts[3])
					.then((lockedPlayerFunds) => {
						assert.ok(lockedPlayerFunds.eq(new BN(testAmount)));
						done();
					});
			}
		};

		// transfer to game second half of test amount
		joyTokenERC223.transferToGame(
			depositInstance.address,
			joyGameInstance.address,
			halfOfTestAmount.toString(), emptyData, { from: accounts[3] }
		)
			.then(() => {
				event.watch(refreshGameSessionHandler);
			});
	});
});
