import populus
from populus.utils.wait import wait_for_transaction_receipt
from populus.utils.cli import request_account_unlock
from populus.utils.accounts import is_account_locked
from web3 import Web3

import utils


def deploySubscription():

    project = populus.Project()

    chain_name = 'ropsten'

    with project.get_chain(chain_name) as chain:

        # Load Populus contract proxy classes
        Subscription = chain.provider.get_contract_factory('Subscription')

        web3 = chain.web3
        print("Web3 provider is", web3.providers)

        # default account from populus perspective
        ownerAddr = web3.eth.defaultAccount;

        print("Contracts will be deployed from: {}".format(ownerAddr))

        # defaultGasPrice = web3.eth.gasPrice
        # print("Default Gas Price: " + str(defaultGasPrice))

        # Deploy subscription contract contract
        txhash_subscribe = Subscription.deploy(transaction={"from": ownerAddr})
        print("Deploying subscription, tx hash is", txhash_subscribe)
        subscribe_receipt = utils.check_succesful_tx(web3, txhash_subscribe)
        subscribe_address = subscribe_receipt["contractAddress"]
        print("Subscription contract address is", subscribe_address)

        # Do some contract reads to see everything looks ok
        print("Some checks on deployed contract:")
        print("Subscription token owner: ", Subscription.call({'to':subscribe_address}).owner())
        print("Subscription initial price: ", Subscription.call({'to':subscribe_address}).subscriptionPrice())
        print("Subscription collected funds: ", Subscription.call({'to':subscribe_address}).collectedFunds())



if __name__ == "__main__":
    deploySubscription()
