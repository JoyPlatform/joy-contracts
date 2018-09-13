import sharedFunctions from './shared_functions';

const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');
const Web3 = require('web3');


contract('GamePlatform_StartGame', (accounts) => {
	const web3 = new Web3();
	const { BN } = web3.utils;
	web3.setProvider(JoyTokenUpgraded.web3.currentProvider);

	const testPlayer = accounts[4];

	// We can do this because JoyToken have same number of decimal places
	const testAmount = web3.utils.toWei('5', 'ether');

	let joyTokenInstance;
	let joyTokenERC223;
	let joyGameInstance;
	let depositInstance;

	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		joyTokenERC223 = await JoyTokenUpgraded.deployed();

		depositInstance = await GameDeposit.deployed();
		joyGameInstance = await JoyGamePlatform.deployed();

		await joyTokenInstance.transfer(testPlayer, testAmount, { from: accounts[0] });

		// allowances
		await joyTokenInstance.approve(joyTokenERC223.address, testAmount, { from: testPlayer });

		// standard transfer
		await joyTokenERC223.transfer(
			depositInstance.address,
			testAmount, { from: accounts[4] }
		);

		await depositInstance.transferToGame(joyGameInstance.address, testAmount, { from: testPlayer });
	});

	afterEach(async () => {
		await sharedFunctions.endGameSession(testPlayer, 'settleGameResults', 'lose_all');
	});


	it('playerLockedFunds_in_deposit', (done) => {
		depositInstance.playerLockedFunds(testPlayer, joyGameInstance.address)
			.then((lockedFunds) => {
				assert.ok(lockedFunds.eq(new BN(testAmount)), 'Bad lockedFunds amount.');
				done();
			});
	});

	it('playerLockedFunds_in_game', (done) => {
		joyGameInstance.playerLockedFunds(testPlayer)
			.then((lockedFundsInGame) => {
				assert.ok(lockedFundsInGame.eq(new BN(testAmount)), 'Bad lockedFunds amount.');
				done();
			});
	});

	it('check_player_deposit', (done) => {
		depositInstance.balanceOfPlayer(testPlayer)
			.then((playerBalance) => {
				assert.ok(playerBalance.eq(new BN('0')), 'Player deposit balance, should be zero.');
				done();
			});
	});

	it('open_session_check', (done) => {
		joyGameInstance.openSessions(testPlayer)
			.then((isOpen) => {
				assert.ok(isOpen, 'Game sessions should be open.');
				done();
			});
	});
});
