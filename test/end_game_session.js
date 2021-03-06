import sharedFunctions from './shared_functions';

const JoyToken = artifacts.require('JoyToken');
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');
const Web3 = require('web3');


contract('EndGameSession', (accounts) => {
	const web3 = new Web3();
	const { BN } = web3.utils;
	web3.setProvider(JoyTokenUpgraded.web3.currentProvider);

	const { settleAndCheck, payoutAndCheck, endGameSession } = sharedFunctions;

	// We can do this because JoyToken have same number of decimal places
	const testAmount = web3.utils.toWei('8', 'ether');
	const testPlayer = accounts[4];

	let joyTokenInstance;
	let joyTokenERC223;
	let joyGameInstance;
	let depositInstance;

	let gameDeveloper;
	let platformReserve;

	function runTests(distributeWay, distributeFunction) {
		contract(distributeWay, () => {
			beforeEach(async () => {
				joyTokenInstance = await JoyToken.deployed();
				joyTokenERC223 = await JoyTokenUpgraded.deployed();

				depositInstance = await GameDeposit.deployed();
				joyGameInstance = await JoyGamePlatform.deployed();

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

			afterEach(async () => {
				await endGameSession(testPlayer, distributeWay);
			});

			it('player_win_unsuccessful', (done) => {
				const remainBalance = new BN('0');
				const finalBalance = (new BN(testAmount)).mul(new BN('2'));
				// winnings are paid from platformReserve
				const reserveWinnings = (new BN(testAmount)).neg();
				const gameDevWinnings = new BN('0');

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.catch((err) => {
						assert.include(
							err.message,
							'VM Exception while processing transaction: revert',
							'There are no funds in platformReserve to account winnings, should be reverted.'
						);
						done();
					});
			});

			it('gamePlatform_bad_constructed', (done) => {
				const maliciousOwner = accounts[2];
				JoyGamePlatform.new(depositInstance.address, gameDeveloper, { from: maliciousOwner })
					.catch((err) => {
						assert.include(
							err.message,
							'VM Exception while processing transaction: revert',
							'JoyPlatform and Deposit owner should be the same address, should be reverted.'
						);
						done();
					});
			});

			it('player_win', (done) => {
				const remainBalance = new BN('0');
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
					.then(() =>
						distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings))
					.then(() => done());
			});

			it('player_lose_all', (done) => {
				// playes lose all
				const remainBalance = new BN('0');
				const finalBalance = new BN('0');
				const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
				const gameDevWinnings = reserveWinnings;

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.then(() => done());
			});

			it('player_endGame_with_zero_balance_in_game', (done) => {
				sharedFunctions.endGameSession(testPlayer, distributeWay)
					.then(() => {
						// no winnings, but should be reverted because of zero balance
						const remainBalance = new BN('0');
						const finalBalance = new BN('0');
						const reserveWinnings = new BN('0');
						const gameDevWinnings = new BN('0');

						distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
							.catch((err) => {
								assert.include(
									err.message,
									'VM Exception while processing transaction: revert',
									'Player want to endGame with zero funds in game, should be reverted.'
								);
								done();
							});
					});
			});

			it('player_lose_almost_all', (done) => {
				// for odd loss additional Token (wei) goes to platformReserve
				const remainBalance = new BN('0');
				const finalBalance = new BN('1');
				const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
				const gameDevWinnings = reserveWinnings.sub(new BN('1'));

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.then(() => done());
			});

			it('player_lose_half', (done) => {
				const remainBalance = new BN('0');
				const finalBalance = (new BN(testAmount)).div(new BN('2'));
				const reserveWinnings = finalBalance.div(new BN('2'));
				const gameDevWinnings = finalBalance.div(new BN('2'));

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.then(() => done());
			});

			it('player_balance_does_not_change', (done) => {
				const remainBalance = new BN('0');
				const finalBalance = new BN(testAmount);
				const reserveWinnings = new BN('0');
				const gameDevWinnings = reserveWinnings;

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.then(() => done());
			});

			// non zero remain balnce
			it('player_win_but_want_more', (done) => {
				const remainBalance = (new BN(testAmount)).mul(new BN('3'));
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
					.then(() =>
						distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings))
					.catch((err) => {
						assert.include(
							err.message,
							'VM Exception while processing transaction: revert',
							'Player want to remain more than his winnings, should be reverted.'
						);
						done();
					});
			});

			it('player_win_remain_start_balance', (done) => {
				const remainBalance = new BN(testAmount);
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
					.then(() =>
						distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings))
					.then(() => done());
			});

			it('player_lose_all_remain_some', (done) => {
				// playes lose all
				const remainBalance = new BN('1');
				const finalBalance = new BN('0');
				const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
				const gameDevWinnings = reserveWinnings;

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.catch((err) => {
						assert.include(
							err.message,
							'VM Exception while processing transaction: revert',
							'Player want to remain some but lose all, should be reverted.'
						);
						done();
					});
			});

			it('player_lose_almost_all_remain_the_rest', (done) => {
				// for odd loss additional Token (wei) goes to platformReserve
				const remainBalance = new BN('1');
				const finalBalance = new BN('1');
				const reserveWinnings = (new BN(testAmount)).div(new BN('2'));
				const gameDevWinnings = reserveWinnings.sub(new BN('1'));

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.then(() => done());
			});

			it('player_lose_half_reamin_some', (done) => {
				const remainBalance = (new BN(testAmount)).div(new BN('4'));
				const finalBalance = (new BN(testAmount)).div(new BN('2'));
				const reserveWinnings = finalBalance.div(new BN('2'));
				const gameDevWinnings = finalBalance.div(new BN('2'));

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.then(() => done());
			});

			it('player_balance_does_not_change_remain_half', (done) => {
				const remainBalance = (new BN(testAmount)).div(new BN('2'));
				const finalBalance = new BN(testAmount);
				const reserveWinnings = new BN('0');
				const gameDevWinnings = reserveWinnings;

				distributeFunction(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings)
					.then(() => done());
			});
		});
	}

	runTests('settleGameResults', settleAndCheck);
	runTests('payOutGameResults', payoutAndCheck);
});
