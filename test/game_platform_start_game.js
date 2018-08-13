const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');
const Web3 = require('web3');


contract('GamePlatform_StartGame', (accounts) => {
	const web3 = new Web3();
	const { BN } = web3.utils;

	web3.setProvider(JoyTokenUpgraded.web3.currentProvider);

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

		await joyTokenInstance.transfer(accounts[4], testAmount, { from: accounts[0] });

		// allowances
		await joyTokenInstance.approve(joyTokenERC223.address, testAmount, { from: accounts[4] });

		// standard transfer
		await joyTokenERC223.transfer(
			depositInstance.address,
			testAmount, { from: accounts[4] }
		);

		await depositInstance.transferToGame(joyGameInstance.address, testAmount, { from: accounts[4] });
	});

	afterEach(async () => {
		// generate randon hex bytes32 as gameHash
		const testGameHash = web3.utils.randomHex(32);
		// playes lose all
		const finalBalance = '0';
		const platformOwner = await depositInstance.owner();

		await joyGameInstance.accountGameResult(accounts[4], finalBalance, testGameHash, { from: platformOwner });
	});


	it('playerLockedFunds_in_deposit', (done) => {
		depositInstance.playerLockedFunds(accounts[4], joyGameInstance.address)
			.then((lockedFunds) => {
				assert.ok(lockedFunds.eq(new BN(testAmount)), 'Bad lockedFunds amount.');
				done();
			});
	});

	it('playerLockedFunds_in_game', (done) => {
		joyGameInstance.playerLockedFunds(accounts[4])
			.then((lockedFundsInGame) => {
				assert.ok(lockedFundsInGame.eq(new BN(testAmount)), 'Bad lockedFunds amount.');
				done();
			});
	});

	it('check_player_deposit', (done) => {
		depositInstance.balanceOfPlayer(accounts[4])
			.then((playerBalance) => {
				assert.ok(playerBalance.eq(new BN('0')), 'Player deposit balance, should be zero.');
				done();
			});
	});

	it('open_session_check', (done) => {
		joyGameInstance.openSessions(accounts[4])
			.then((isOpen) => {
				assert.ok(isOpen, 'Game sessions should be open.');
				done();
			});
	});
});
