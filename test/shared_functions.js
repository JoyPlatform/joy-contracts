/* eslint-disable no-console */
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');
const Web3 = require('web3');


const sharedFunctions = (() => {
	const web3 = new Web3();
	const { BN } = web3.utils;

	let joyTokenERC223;
	let depositInstance;
	let joyGameInstance;
	let platformReserve;
	let gameDeveloper;
	let platformOwner;

	function initContracts() {
		return new Promise(async (resolve) => {
			joyTokenERC223 = await JoyTokenUpgraded.deployed();
			depositInstance = await GameDeposit.deployed();
			joyGameInstance = await JoyGamePlatform.deployed();
			platformOwner = await depositInstance.owner();
			platformReserve = await depositInstance.platformReserve();
			gameDeveloper = await joyGameInstance.gameDev();
			resolve();
		});
	}

	function checkPlayerBalance(testPlayer, initialPlayerBalance, playerBalance, remainBalance, finalBalance) {
		return new Promise(async (resolve) => {
			assert.ok(
				playerBalance.eq(initialPlayerBalance.add(finalBalance.sub(remainBalance))),
				'Player balance should by equal finalBalance reduced by remainBalance.'
			);

			const lockedFunds = await depositInstance.playerLockedFunds(testPlayer, joyGameInstance.address);
			assert.ok(
				lockedFunds.eq(remainBalance),
				'Player locked funds should by equal to remainBalance.'
			);

			resolve();
		});
	}

	function checkDepositBalances(
		initialReserveBalance,
		initialGameDevBalance,
		reserveWinnings,
		gameDevWinnings
	) {
		return new Promise(async (resolve) => {
			const reserveBalance = await depositInstance.balanceOfPlayer(platformReserve);
			assert.ok(
				reserveBalance.eq(initialReserveBalance.add(reserveWinnings)),
				'Reserve balance should be inceased.'
			);

			const gameDevBalance = await depositInstance.balanceOfPlayer(gameDeveloper);
			assert.ok(
				gameDevBalance.eq(initialGameDevBalance.add(gameDevWinnings)),
				'GameDev balance should be inceased.'
			);
			resolve();
		});
	}

	function settleAndCheck(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings) {
		// generate randon hex bytes32 as gameId and gameSig
		const testGameId = web3.utils.randomHex(32);
		const testGameSig = web3.utils.randomHex(32);

		return new Promise(async (resolve, reject) => {
			await initContracts();

			const initialPlayerBalance = await depositInstance.balanceOfPlayer(testPlayer);
			const initialReserveBalance = await depositInstance.balanceOfPlayer(platformReserve);
			const initialGameDevBalance = await depositInstance.balanceOfPlayer(gameDeveloper);

			try {
				await joyGameInstance.accountGameResult(
					testPlayer,
					remainBalance.toString(),
					finalBalance.toString(),
					testGameId,
					testGameSig,
					{ from: platformOwner }
				);
			} catch (err) {
				reject(err);
				return;
			}

			// balance in deposit
			const playerBalance = await depositInstance.balanceOfPlayer(testPlayer);

			await checkPlayerBalance(
				testPlayer,
				initialPlayerBalance,
				playerBalance,
				remainBalance,
				finalBalance
			);
			await checkDepositBalances(
				initialReserveBalance,
				initialGameDevBalance,
				reserveWinnings.valueOf(),
				gameDevWinnings.valueOf()
			);
			resolve();
		});
	}

	function payoutAndCheck(testPlayer, remainBalance, finalBalance, reserveWinnings, gameDevWinnings) {
		// generate randon hex bytes32 as gameId and gameSig
		const testGameId = web3.utils.randomHex(32);
		const testGameSig = web3.utils.randomHex(32);

		return new Promise(async (resolve, reject) => {
			await initContracts();
			const initialPlayerWalletBalance = await joyTokenERC223.balanceOf(testPlayer);
			const initialReserveBalance = await depositInstance.balanceOfPlayer(platformReserve);
			const initialGameDevBalance = await depositInstance.balanceOfPlayer(gameDeveloper);

			try {
				await joyGameInstance.payOutGameResult(
					testPlayer,
					remainBalance.toString(),
					finalBalance.toString(),
					testGameId,
					testGameSig,
					{ from: platformOwner }
				);
			} catch (err) {
				reject(err);
				return;
			}

			// balance in wallet
			const playerWalletBalance = await joyTokenERC223.balanceOf(testPlayer);

			await checkPlayerBalance(
				testPlayer,
				initialPlayerWalletBalance,
				playerWalletBalance,
				remainBalance,
				finalBalance
			);

			await checkDepositBalances(
				initialReserveBalance,
				initialGameDevBalance,
				reserveWinnings,
				gameDevWinnings
			);
			resolve();
		});
	}

	// if player has open game session, close it with no lose and no winnings.
	function endGameSession(testPlayer, distributeWay, finalBalanceTag) {
		return new Promise(async (resolve) => {
			let finalBalance;
			const playerLockedBalance = await depositInstance.playerLockedFunds(testPlayer, joyGameInstance.address);
			if (finalBalanceTag === 'lose_all') {
				finalBalance = '0';
			} else {
				finalBalance = playerLockedBalance;
			}

			if (playerLockedBalance.gt(new BN('0'))) {
				// generate randon hex bytes32 as gameId and gameSig
				const testGameId = web3.utils.randomHex(32);
				const testGameSig = web3.utils.randomHex(32);
				const remainBalance = '0';

				if (distributeWay === 'settleGameResults') {
					await joyGameInstance.accountGameResult(
						testPlayer,
						remainBalance,
						finalBalance,
						testGameId,
						testGameSig,
						{ from: platformOwner }
					);
				} else if (distributeWay === 'payOutGameResults') {
					await joyGameInstance.payOutGameResult(
						testPlayer,
						remainBalance,
						finalBalance,
						testGameId,
						testGameSig,
						{ from: platformOwner }
					);
				}
			}
			resolve();
		});
	}

	function logStatus(testPlayer) {
		return new Promise(async (resolve) => {
			await initContracts();

			const playerWallet = await joyTokenERC223.balanceOf(testPlayer);
			const depositWallet = await joyTokenERC223.balanceOf(depositInstance.address);
			const reserveWallet = await joyTokenERC223.balanceOf(platformReserve);
			const gameDevWallet = await joyTokenERC223.balanceOf(gameDeveloper);

			const playerBalance = await depositInstance.balanceOfPlayer(testPlayer);
			const depositBalance = await depositInstance.balanceOfPlayer(depositInstance.address);
			const reserveBalance = await depositInstance.balanceOfPlayer(platformReserve);
			const gameDevBalance = await depositInstance.balanceOfPlayer(gameDeveloper);

			const playerLocked = await depositInstance.playerLockedFunds(testPlayer, joyGameInstance.address);

			const depositLocked =
				await depositInstance.playerLockedFunds(depositInstance.address, joyGameInstance.address);

			const reserveLocked = await depositInstance.playerLockedFunds(platformReserve, joyGameInstance.address);
			const gameDevLocked = await depositInstance.playerLockedFunds(gameDeveloper, joyGameInstance.address);

			console.log('Token distribution status:');
			console.log('\tplayerWallet', playerWallet.valueOf());
			console.log('\tdepositWallet', depositWallet.valueOf());
			console.log('\treserveWallet', reserveWallet.valueOf());
			console.log('\tgameDevWallet', gameDevWallet.valueOf());

			console.log('\tplayerBalance', playerBalance.valueOf());
			console.log('\tdepositBalance', depositBalance.valueOf());
			console.log('\treserveBalance', reserveBalance.valueOf());
			console.log('\tgameDevBalance', gameDevBalance.valueOf());

			console.log('\tplayerLocked', playerLocked.valueOf());
			console.log('\tdepositLocked', depositLocked.valueOf());
			console.log('\treserveLocked', reserveLocked.valueOf());
			console.log('\tgameDevLocked', gameDevLocked.valueOf());

			resolve();
		});
	}

	return {
		settleAndCheck,
		payoutAndCheck,
		endGameSession,
		logStatus
	};
})();

export default sharedFunctions;
