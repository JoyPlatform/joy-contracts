# joy-contracts

Joy Platform - main repository for testing and deploying smart-contracts.

Smart-contracts are located in `contracts` directory.
Tests and contracts migrations uses [Truffle](https://github.com/trufflesuite/truffle)

**deprecated code which uses [Populus framework](https://github.com/pipermerriam/populus "populus github repository") was moved to separated `populus` directory.*

## download sources

From Linux/OSX console:
```
git clone https://github.com/JoyPlatform/joy-contracts.git
```

## build

### install dependencies

- `npm` - JavaScript package manager
- `truffle` - framework for solidity smart-contracts
- `solc` - solidity compiler

### configuration

Basic test/development configuration is available in `truffle-config.js` file.
For more advanced usage, migrations to testnet or main network, configuration must be upgraded.

### compilation

```
$ truffle compile
```
#### example output:
```
Compiling ./contracts/deposit/PlatformDeposit.sol...
Compiling ./contracts/game/JoyGameAbstract.sol...
Compiling ./contracts/game/JoyGameDemo.sol...
Compiling ./contracts/math/SafeMath.sol...
Compiling ./contracts/ownership/Ownable.sol...
Compiling ./contracts/subscribe/Subscription.sol...
Compiling ./contracts/subscribe/SubscriptionWithJoyToken.sol...
Compiling ./contracts/token/BasicToken.sol...
Compiling ./contracts/token/ERC20.sol...
Compiling ./contracts/token/ERC20Basic.sol...
Compiling ./contracts/token/ERC223ReceivingContract.sol...
Compiling ./contracts/token/JoyReceivingContract.sol...
Compiling ./contracts/token/JoyToken.sol...
Compiling ./contracts/token/StandardToken.sol...

Writing artifacts to ./build/contracts
```

Output is serialized as JSON and written to build/contracts.json

## running tests

Tests are written using JS mocha and requires ganache-cli (testing Ethereum RPC client):

```
$ npm run ganache
$ npm run test  # in separated terminal/tab
```
#### example output:
```
  Contract: JoyToken
    ✓ JoyToken Name
    ✓ JoyToken Symbol
    ✓ JoyToken Decimal
    ✓ Total Supply of JoyToken
    ✓ Initialy the owner of contract have full totalSupply
    Contract: Transfers Tests
      ✓ Transfers - series of few transactions
      ✓ Transfers failed - to big amount
      ✓ Transfers failed - from empty

  Contract: JoyToken_OverloadedTransfer
    ✓ Transfer with addtional data

  Contract: PlatformDeposit
    ✓ Transfer_to_deposit
    ✓ Transfer_to_many
    ✓ payOut_from_deposit
    ✓ fail_to_friend
    ✓ fail_payOut

  Contract: Subscription_with_ether
    ✓ Check_price
    ✓ Set_price_fail
    ✓ Set_price
    ✓ Buy_subscription_fail
    ✓ Buy_subscription
    ✓ Collected_funds
    ✓ Payout_funds
    ✓ Payout_funds_to_friend

  Contract: Subscription_with_ether
    ✓ Check_price
    ✓ Set_price_fail
    ✓ Set_price
    ✓ Buy_subscription_fail
    ✓ Buy_subscription
    ✓ Collected_funds
    ✓ Payout_funds
    ✓ Payout_funds_to_friend

  30 passing
```
