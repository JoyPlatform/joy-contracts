import sharedFunctions from './shared_functions';

const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');
const Web3 = require('web3');


contract('Account_Game_Result', (accounts) => {
	const { settleAndCheck } = sharedFunctions;
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
		const playerLockedBalance = await depositInstance.playerLockedFunds(testPlayer, joyGameInstance.address);
		if (playerLockedBalance.gt(new BN('0'))) {
			const testGameHash = web3.utils.randomHex(32);
			const remainBalance = '0';

			await joyGameInstance.accountGameResult(
				testPlayer,
				remainBalance,
				playerLockedBalance,
				testGameHash,
				{ from: platformOwner }
			);
		}
	});

	it('player_win_unsuccessful', (done) => {
		const finalBalance = (new BN(testAmount)).mul(new BN('2'));
		// winnings are paid from platformReserve
		const reserveWinnings = (new BN(testAmount)).neg();
		const gameDevWinnings = new BN('0');

		settleAndCheck(testPlayer, finalBalance, reserveWinnings, gameDevWinnings)
			.catch((err) => {
				assert.include(
					err.message,
					'VM Exception while processing transaction: revert',
					'There are no funds in platformReserve to account winning, should be reverted.'
				);
				done();
			});
	});

	it('player_win', (done) => {
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
			.then(() => settleAndCheck(testPlayer, finalBalance, reserveWinnings, gameDevWinnings))
			.then(() => done());
	});

	it('player_lose_all', (done) => {
		// playes lose all
		const finalBalance = new BN('0');
		const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
		const gameDevWinnings = reserveWinnings;

		settleAndCheck(testPlayer, finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});

	it('player_lose_almost_all', (done) => {
		// for odd loss additional Token (wei) goes to platformReserve
		const finalBalance = new BN('1');
		const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
		const gameDevWinnings = reserveWinnings.sub(new BN('1'));

		settleAndCheck(testPlayer, finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});

	it('player_lose_half', (done) => {
		const finalBalance = (new BN(testAmount)).div(new BN('2'));
		const reserveWinnings = finalBalance.div(new BN('2'));
		const gameDevWinnings = finalBalance.div(new BN('2'));

		settleAndCheck(testPlayer, finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});

	it('player_balance_does_not_change', (done) => {
		const finalBalance = new BN(testAmount);
		const reserveWinnings = new BN('0');
		const gameDevWinnings = reserveWinnings;

		settleAndCheck(testPlayer, finalBalance, reserveWinnings, gameDevWinnings)
			.then(() => done());
	});
});
