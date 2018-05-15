"""
A simple Python script that checking basic properties from geth node
and test basic API from populus library
Populus uses ropsten testnet
"""

import populus
from web3 import Web3, IPCProvider


def load_ipcPATH():
    try:
        f = open("gethipc.config", "r")
        ipc_path = f.read()

        # deleting whitespaces and return
        return ipc_path.rstrip()
    except Exception:
        print("You should provide 'gethipc.config' with geth.ipc PATH")
        print("Exiting")
        exit(1)


# standard web3 need running geth node, and don't give chains choise
def web3_standard():

    gethipc_path = load_ipcPATH()
    web3 = Web3(Web3.IPCProvider(gethipc_path))

    check_base_properties(web3)


# web3 from populus library, using populus.json configuration file
def web3_populus_project():
    project = populus.Project()

    # We are working on a testnet
    chain_name = 'ropsten'
    print("Make sure {} chain is running, you can connect to it, or you'll get timeout".format(chain_name))

    # dbg
    ropsten_config = project.config['chains.ropsten.web3']
    print("Ropsten config: {}".format(ropsten_config))

    # with ropsten chain
    with project.get_chain(chain_name) as chain:

        web3 = chain.web3

        check_base_properties(web3)


def check_base_properties(web3):

    print("Web3 provider is", web3.providers)

    # The address who will be the owner of the contracts
    coinbase = web3.eth.coinbase
    assert coinbase, "Make sure your node has coinbase account created"

    print("Your coinbase address: " + coinbase)

    default_acc = web3.eth.defaultAccount

    if not default_acc:
        print("Your default account is undefined")
    else:
        print("Your default account address: " + default_acc)

def main():
    print("-------------------------------------------------------------------------")

    print("Trying web3 standard")
    web3_standard()

    print("-------------------------------------------------------------------------")

    print("Trying web3 populus")
    web3_populus_project()

    print("-------------------------------------------------------------------------")


if __name__ == "__main__":
    main()
