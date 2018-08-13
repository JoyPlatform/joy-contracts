const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');
const Web3 = require('web3');

contract('JoyToken_TransferToGame', (accounts) => {
	const web3 = new Web3();
	const { BN } = web3.utils;
	web3.setProvider(JoyTokenUpgraded.web3.currentProvider);

	// We can do this because JoyToken have same number of decimal places
	const testAmount = web3.utils.toWei('8', 'ether');
	const testPlayer = accounts[4];

	let joyTokenInstance;
	let joyTokenERC223;
	let joyGameInstance;
	let depositInstance;

	let platformOwner;
	let gameDeveloper;
	let platformReserve;

	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		joyTokenERC223 = await JoyTokenUpgraded.deployed();

		depositInstance = await GameDeposit.deployed();
		joyGameInstance = await JoyGamePlatform.deployed();

		platformOwner = await depositInstance.owner();
		platformReserve = await depositInstance.platformReserve();
		gameDeveloper = await joyGameInstance.gameDev();

		assert.notEqual(
			platformReserve, gameDeveloper,
			'This test suite does not make sense if platformReserve and gameDev have the same address'
		);

		await joyTokenInstance.transfer(testPlayer, testAmount, { from: accounts[0] });

		// allowances
		await joyTokenInstance.approve(joyTokenERC223.address, testAmount, { from: testPlayer });

		await joyTokenERC223.transferToGame(
			depositInstance.address,
			joyGameInstance.address,
			testAmount, '0x', { from: testPlayer }
		);
	});

	// if player has open game session, close it with no lose and no winnings.
	afterEach(async () => {
		const testGameHash = web3.utils.randomHex(32);

		const playerLockedBalance = await depositInstance.playerLockedFunds(testPlayer, joyGameInstance.address);
		if (playerLockedBalance.gt(new BN('0'))) {
			await joyGameInstance.accountGameResult(
				testPlayer,
				playerLockedBalance,
				testGameHash,
				{ from: platformOwner }
			);
		}
	});


	function checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings) {
		// generate randon hex bytes32 as gameHash
		const testGameHash = web3.utils.randomHex(32);
		let initialPlayerBalance;
		let initialReserveBalance;
		let initialGameDevBalance;


		return new Promise(async (resolve, reject) => {
			depositInstance.balanceOfPlayer(testPlayer)
				.then((balance) => {
					initialPlayerBalance = balance;
					return depositInstance.balanceOfPlayer(platformReserve);
				})
				.then((balance) => {
					initialReserveBalance = balance;
					return depositInstance.balanceOfPlayer(gameDeveloper);
				})
				.then(async (balance) => {
					initialGameDevBalance = balance;
					return joyGameInstance.accountGameResult(
						testPlayer,
						finalBalance.toString(),
						testGameHash,
						{ from: platformOwner }
					);
				})
				.then(() => depositInstance.balanceOfPlayer(testPlayer))
				.then((playerBalance) => {
					assert.ok(
						playerBalance.eq(initialPlayerBalance.add(finalBalance)),
						'Player balance should by equal finalBalance.'
					);
					return depositInstance.playerLockedFunds(testPlayer, joyGameInstance.address);
				})
				.then((lockedFunds) => {
					assert.ok(lockedFunds.eq(new BN('0')), 'Player locked funds should by equal to 0.');
					return depositInstance.balanceOfPlayer(platformReserve);
				})
				.then((reserveBalance) => {
					assert.ok(
						reserveBalance.eq(initialReserveBalance.add(reserveWinnings)),
						'Reserve balance should be inceased.'
					);
					return depositInstance.balanceOfPlayer(gameDeveloper);
				})
				.then((gameDevBalance) => {
					assert.ok(
						gameDevBalance.eq(initialGameDevBalance.add(gameDevWinnings)),
						'GameDev balance should be inceased.'
					);
					resolve();
				})
				.catch(err => reject(err));
		});
	}

	it('accountGameResult_player_win_unsuccessful', (done) => {
		const finalBalance = (new BN(testAmount)).mul(new BN('2'));
		// winnings are paid from platformReserve
		const reserveWinnings = (new BN(testAmount)).neg();
		const gameDevWinnings = new BN('0');

		checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings)
			.catch((err) => {
				assert.include(
					err.message,
					'VM Exception while processing transaction: revert',
					'There are no funds in platformReserve to account winning, should be reverted.'
				);
				done();
			});
	});

	it('accountGameResult_player_win', (done) => {
		const finalBalance = (new BN(testAmount)).mul(new BN('2'));
		// winnings are paid from platformReserve
		const reserveWinnings = (new BN(testAmount)).neg();
		const gameDevWinnings = new BN('0');

		// fund platformReserve
		Promise.all([
			joyTokenInstance.transfer(platformReserve, testAmount, { from: accounts[0] }),
			joyTokenInstance.approve(joyTokenERC223.address, testAmount, { from: platformReserve }),
			joyTokenERC223.transfer(depositInstance.address, testAmount, { from: platformReserve })
		])
			.then(() => checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings))
			.then(() => done());
	});

	it('accountGameResult_player_lose_all', (done) => {
		// playes lose all
		const finalBalance = new BN('0');
		const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
		const gameDevWinnings = reserveWinnings;

		checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});

	it('accountGameResult_player_lose_almost_all', (done) => {
		// for odd loss additional Token (wei) goes to platformReserve
		const finalBalance = new BN('1');
		const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
		const gameDevWinnings = reserveWinnings.sub(new BN('1'));

		checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});

	it('accountGameResult_player_lose_half', (done) => {
		const finalBalance = (new BN(testAmount)).div(new BN('2'));
		const reserveWinnings = finalBalance.div(new BN('2'));
		const gameDevWinnings = finalBalance.div(new BN('2'));

		checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});

	it('accountGameResult_player_balance_does_not_change', (done) => {
		const finalBalance = new BN(testAmount);
		const reserveWinnings = new BN('0');
		const gameDevWinnings = reserveWinnings;

		checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});

/*
	it('payOutGameResult_example', (done) => {
		const finalBalance = new BN(testAmount);
		const reserveWinnings = new BN('0');
		const gameDevWinnings = reserveWinnings;

		checkAccountedBalances(finalBalance, reserveWinnings, gameDevWinnings, 'payOut')
			.then(() => done());
	});
*/
});
