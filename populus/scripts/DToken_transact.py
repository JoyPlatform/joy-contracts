import populus
from populus.utils.wait import wait_for_transaction_receipt
from web3 import Web3

import utils



def performTransfer():

    project = populus.Project()

    chain_name = 'ropsten'

    with project.get_chain(chain_name) as chain:

        web3 = chain.web3

        DToken = chain.provider.get_contract('DToken')

        print("This script will perform transfer of DTokens, if you don't want to transfer tokens, please abort program")
        input_addr = input("Specify address: ")
        input_amount = input ("Specify amount: ")

        print("Token will be send: ")
        print("From: {}".format(web3.eth.defaultAccount))
        print("To: {}".format(input_addr))
        print("Value: {}".format(input_amount))

        defaultGasPrice = web3.eth.gasPrice
        print("Default Gas Price: " + str(defaultGasPrice))

        # call Token transfer as transaction
        # multiple gas price to get fast confirmations
        txhash = DToken.transact({'gasPrice': (defaultGasPrice*5)}).transfer(input_addr,int(input_amount))

        print("Transaction hash: {}".format(txhash))

        receipt = utils.check_succesful_tx(web3, txhash)
        print("Transaction was confirmed")


if __name__ == "__main__":
    performTransfer()
