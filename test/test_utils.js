/* eslint-disable no-console */
const JoyTokenUpgraded = artifacts.require('JoyTokenUpgraded');
const GameDeposit = artifacts.require('GameDeposit');
const JoyGamePlatform = artifacts.require('JoyGamePlatform');


function logStatus(testPlayer) {
	return new Promise(async (resolve) => {
		const joyTokenERC223 = await JoyTokenUpgraded.deployed();

		const depositInstance = await GameDeposit.deployed();
		const joyGameInstance = await JoyGamePlatform.deployed();

		const platformReserve = await depositInstance.platformReserve();
		const gameDeveloper = await joyGameInstance.gameDev();


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

export default logStatus;
