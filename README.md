# joy-contracts
[![Build Status](https://img.shields.io/travis/JoyPlatform/joy-contracts.svg?branch=develop&style=flat-square)](https://travis-ci.org/JoyPlatform/joy-contracts)
[![Coverage Status](https://img.shields.io/coveralls/github/JoyPlatform/joy-contracts/develop.svg?style=flat-square)](https://coveralls.io/github/JoyPlatform/joy-contracts?branch=develop)

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

## running tests

Tests are written using JS mocha and requires ganache-cli (testing Ethereum RPC client):

All tests can be run:
```
$ npm run test
```

or if needed. Specific test file:
```
$ npm run ganache
$ truffle test test/testfile.js  # in separated terminal/tab
```
