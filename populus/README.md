# joy-contracts

Joy Platform - main repository for testing and deploying smart-contracts.

Smart-contracts are located in `contracts` directory.
[Populus framework](https://github.com/pipermerriam/populus "populus github repository") was used to compile, deploy and test our smart-contracts.

## download sources

From Linux/OSX console:
```
git clone https://github.com/JoyPlatform/joy-contracts.git
```

## build

### dependencies

- `python3` - python language intepreter
- `populus` - framework for solidity smart-contracts
- `solc` - solidity compiler

### compilation

```
$ populus compile
==========================================================================
> Found 12 contract source files
  - contracts/deposit/PlatformDeposit.sol
  - contracts/game/JoyGameAbstract.sol
  - contracts/game/JoyGameDemo.sol
  - contracts/math/SafeMath.sol
  - contracts/ownership/Ownable.sol
  - contracts/token/BasicToken.sol
  - contracts/token/DToken.sol
  - contracts/token/ERC20.sol
  - contracts/token/ERC20Basic.sol
  - contracts/token/ERC223ReceivingContract.sol
  - contracts/token/MultiContractAsset.sol
  - contracts/token/StandardToken.sol
> Compiled 12 contracts
  - contracts/deposit/PlatformDeposit.sol:PlatformDeposit
  - contracts/game/JoyGameAbstract.sol:JoyGameAbstract
  - contracts/game/JoyGameDemo.sol:JoyGameDemo
  - contracts/math/SafeMath.sol:SafeMath
  - contracts/ownership/Ownable.sol:Ownable
  - contracts/token/BasicToken.sol:BasicToken
  - contracts/token/DToken.sol:DToken
  - contracts/token/ERC20.sol:ERC20
  - contracts/token/ERC20Basic.sol:ERC20Basic
  - contracts/token/ERC223ReceivingContract.sol:ERC223ReceivingContract
  - contracts/token/MultiContractAsset.sol:MultiContractAsset
  - contracts/token/StandardToken.sol:StandardToken
> Wrote compiled assets to: build/contracts.json

```

Output is serialized as JSON and written to build/contracts.json

## running tests

Tests are written using `py.test` and can be run from root directory by:

```
$ py.test
```
