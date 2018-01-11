from populus.utils.wait import wait_for_transaction_receipt
from ethereum.tester import TransactionFailed

# Test erc223_token transfer to supporting contract
def test_sendToContract(web3, chain):
    # deploy JoyToken and contract that support receiving erc223 Tokens, from coinbase address
    JoyToken = chain.provider.get_contract_factory('JoyToken')
    PlatformDeposit = chain.provider.get_contract_factory('PlatformDeposit')


    txhash_token = JoyToken.deploy(transaction={"from": web3.eth.coinbase})
    token_receipt = wait_for_transaction_receipt(web3, txhash_token)
    token_address = token_receipt["contractAddress"]


    txhash_deposit = PlatformDeposit.deploy(transaction={"from": web3.eth.coinbase}, args=[token_address, web3.eth.accounts[1]])
    deposit_receipt = wait_for_transaction_receipt(web3, txhash_deposit)
    deposit_address = deposit_receipt["contractAddress"]

    # send some JoyTokens to another address, player
    player = web3.eth.accounts[1]

    # check preconditions
    assert JoyToken.call({ 'to': token_address }).balanceOf(player) == 0
    assert PlatformDeposit.call({ 'to': deposit_address }).balanceOfPlayer(player) == 0

    JoyToken.transact({ 'from': web3.eth.coinbase, 'to': token_address }).transfer(player, 50000);

    assert JoyToken.call({ 'to': token_address }).balanceOf(player) == 50000

    # transfer to contract
    JoyToken.transact({ 'from': player, 'to': token_address }).transfer(deposit_address, 50000);

    assert JoyToken.call({ 'to': token_address }).balanceOf(player) == 0
    assert PlatformDeposit.call({ 'to': deposit_address }).balanceOfPlayer(player) == 50000

    # payOut from contract to regular address
    PlatformDeposit.transact({ 'from':player, 'to': deposit_address }).payOut(player, 50000);

    # check postconditions
    assert JoyToken.call({ 'to': token_address }).balanceOf(player) == 50000
    assert PlatformDeposit.call({ 'to': deposit_address }).balanceOfPlayer(player) == 0

# Test erc223_token transfer to not supporting contract
def test_sendToContract(web3, chain):
    # deploy JoyToken and contract that not support receiving erc223 Tokens
    JoyToken = chain.provider.get_contract_factory('JoyToken')
    SubscriptionWithEther = chain.provider.get_contract_factory('SubscriptionWithEther')

    txhash_token = JoyToken.deploy(transaction={"from": web3.eth.coinbase})
    token_receipt = wait_for_transaction_receipt(web3, txhash_token)
    token_address = token_receipt["contractAddress"]

    txhash_subscribe = SubscriptionWithEther.deploy(transaction={"from": web3.eth.coinbase})
    subscribe_receipt = wait_for_transaction_receipt(web3, txhash_subscribe)
    subscribe_address = subscribe_receipt["contractAddress"]

    failed = False
    try:
        JoyToken.transact({ 'from': web3.eth.coinbase, 'to': token_address }).transfer(subscribe_address, 10000);
    except TransactionFailed:
        failed = True

    assert failed
