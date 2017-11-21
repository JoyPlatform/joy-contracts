import populus
from populus.utils.wait import wait_for_transaction_receipt
from populus.utils.cli import request_account_unlock
from populus.utils.accounts import is_account_locked
from web3 import Web3

import utils


def deployDemoContracts():

    project = populus.Project()

    chain_name = 'ropsten'

    with project.get_chain(chain_name) as chain:

        # Load Populus contract proxy classes
        JoyToken = chain.provider.get_contract_factory('JoyToken')
        PlatformDeposit = chain.provider.get_contract_factory('PlatformDeposit')
        JoyGameDemo = chain.provider.get_contract_factory('JoyGameDemo')

        web3 = chain.web3
        print("Web3 provider is", web3.providers)

        # default account from populus perspective
        ownerAddr = web3.eth.defaultAccount;
        print("Contracts will be deployed from: {}".format(ownerAddr))

        defaultGasPrice = web3.eth.gasPrice
        print("Default Gas Price: " + str(defaultGasPrice))
        # multiple gas price to get fast confirmations
        #txhash = DToken.transact({'gasPrice': (defaultGasPrice*5)}).transfer(input_addr,int(input_amount))

        # unlock owner account
        #timeout=100
        #print("acc locked: {}".format(is_account_locked(web3,ownerAddr)))

        # Deploy token contract
        txhash_token = JoyToken.deploy(transaction={"from": ownerAddr})
        print("deploying token, tx hash is", txhash_token)
        receipt = utils.check_succesful_tx(web3, txhash_token)
        token_address = receipt["contractAddress"]
        print("token contract address is", token_address)

        # address needed by deposit contract, it is good to different than owner
        platformReserve_address = input ("Give platform reserve address: ")

        # Deploy deposit contract with token_address
        txhash_deposit = PlatformDeposit.deploy(transaction={"from": ownerAddr}, args=[token_address, platformReserve_address])
        print("Deploying deposit contract, tx hash is", txhash_deposit)
        receipt = utils.check_succesful_tx(web3, txhash_deposit)
        deposit_address = receipt["contractAddress"]
        print("Deposit contract address is", deposit_address)

        # game developer address
        gameDev = input ("Give game developer address: ")

        txhash_game = JoyGameDemo.deploy(transaction={"from": ownerAddr}, args=[deposit_address, gameDev])
        print("Deploying game demo contract, tx hash is", txhash_game)
        receipt = utils.check_succesful_tx(web3, txhash_game)
        game_address = receipt["contractAddress"]
        print("DemoGame contract address is", game_address)

        # Do some contract reads to see everything looks ok
        print("Some checks on deployed contracts:")
        print("Token name: ", JoyToken.call({'to':token_address}).name())
        print("Token symbol: ", JoyToken.call({'to':token_address}).symbol())
        print("Token total supply is: ", JoyToken.call({'to':token_address}).totalSupply())
        print("Token decimal places: ", JoyToken.call({'to':token_address}).decimals())
        print("Deposit owner is: ", PlatformDeposit.call({'to':deposit_address}).owner())
        print("Deposit platformReserve address: ", PlatformDeposit.call({'to':deposit_address}).platformReserve())
        print("Deposit supported Token address: ", PlatformDeposit.call({'to':deposit_address}).m_supportedToken())
        print("Game developer is: ", JoyGameDemo.call({'to':game_address}).gameDev())
        print("Game contract using deposit (address): ", JoyGameDemo.call({'to':game_address}).m_playerDeposits())



if __name__ == "__main__":
    deployDemoContracts()
