const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGameDemo = artifacts.require('JoyGameDemo');
const Web3 = require('web3');


contract('JoyToken_TransferToGame', (accounts) => {
	const web3 = new Web3();
	web3.setProvider(JoyTokenUpgraded.web3.currentProvider);

	// We can do this because JoyToken have same number of decimal places
	const testAmount = web3.utils.toWei('10', 'ether');

	let joyTokenInstance;
	let joyTokenERC223;
	let joyGameInstance;
	let depositInstance;

	beforeEach(async () => {
		joyTokenInstance = await JoyToken.deployed();
		joyTokenERC223 = await JoyTokenUpgraded.deployed();

		depositInstance = await GameDeposit.deployed();
		joyGameInstance = await JoyGameDemo.deployed();

		await joyTokenInstance.transfer(accounts[2], testAmount, { from: accounts[0] });

		// allowances
		await joyTokenInstance.approve(joyTokenERC223.address, testAmount, { from: accounts[2] });


		await joyTokenERC223.transferToGame(
			depositInstance.address,
			joyGameInstance.address,
			testAmount, '0x', { from: accounts[2] }
		);
	});

	afterEach(async () => {
		// generate randon hex bytes32 as gameHash
		const testGameHash = web3.utils.randomHex(32);
		// playes lose all
		const finalBalance = '0';
		await joyGameInstance.responseFromWS(accounts[2], finalBalance, testGameHash);
	});


	it('playerLockedFunds_in_deposit', (done) => {
		depositInstance.playerLockedFunds(accounts[2])
			.then((lockedFunds) => {
				assert.ok(lockedFunds.eq(testAmount), 'Bad lockedFunds amount.');
				done();
			});
	});

	it('playerLockedFunds_in_game', (done) => {
		joyGameInstance.playerLockedFunds(accounts[2])
			.then((lockedFundsInGame) => {
				assert.ok(lockedFundsInGame.eq(testAmount), 'Bad lockedFunds amount.');
				done();
			});
	});

	it('check_player_deposit', (done) => {
		depositInstance.balanceOfPlayer(accounts[2])
			.then((playerBalance) => {
				assert.ok(playerBalance.eq('0'), 'Player deposit balance, should be zero.');
				done();
			});
	});

	it('open_session_check', (done) => {
		joyGameInstance.openSessions(accounts[2])
			.then((isOpen) => {
				assert.ok(isOpen, 'Game sessions should be open.');
				done();
			});
	});
});
