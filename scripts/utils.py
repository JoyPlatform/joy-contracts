import populus
from populus.utils.wait import wait_for_transaction_receipt
from web3 import Web3


"""
Inspiration from official populus documentation.
http://populus.readthedocs.io
"""
def check_succesful_tx(web3: Web3, txid: str, timeout=600) -> dict:
    """See if transaction went through (Solidity code did not throw).

    :return: Transaction receipt
    """

    # http://ethereum.stackexchange.com/q/6007/620
    receipt = wait_for_transaction_receipt(web3, txid, timeout=timeout)
    txinfo = web3.eth.getTransaction(txid)

    # EVM has only one error mode and it's consume all gas
    assert txinfo["gas"] != receipt["gasUsed"]
    return receipt

