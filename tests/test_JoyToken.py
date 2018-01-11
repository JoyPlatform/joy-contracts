from populus.utils.wait import wait_for_transaction_receipt
from ethereum.tester import TransactionFailed

# test basic properties of JoyToken
def test_baseProperties(chain):
    JoyToken, _ = chain.provider.get_or_deploy_contract('JoyToken')

    JoyToken_name = JoyToken.call().name()
    assert JoyToken_name == "JoyToken"

    JoyToken_symbol = JoyToken.call().symbol()
    assert JoyToken_symbol == "JOY"

    JoyToken_decimals = JoyToken.call().decimals()
    assert JoyToken_decimals == 10

    JoyToken_supply = JoyToken.call().totalSupply()
    assert JoyToken_supply == 700000000 * (10 ** JoyToken_decimals)


def test_simpleTransfer(web3, chain):
    # deploy JoyToken from coinbase address
    JoyToken, _ = chain.provider.get_or_deploy_contract('JoyToken')

    # get initial token balance == 21000000
    JoyToken_supply = JoyToken.call().totalSupply()

    # use balanceOf method to check creator token balance
    coinbase_balance = JoyToken.call().balanceOf(web3.eth.coinbase)

    assert coinbase_balance == JoyToken_supply

    # transfer to acc 1
    JoyToken.transact({ 'from': web3.eth.coinbase }).transfer(web3.eth.accounts[1], 3000);

    # update coinbase balance
    coinbase_balance = JoyToken.call().balanceOf(web3.eth.coinbase)
    # checks
    assert coinbase_balance == (JoyToken_supply - 3000)
    assert JoyToken.call().balanceOf(web3.eth.accounts[1]) == 3000
    assert JoyToken.call().balanceOf(web3.eth.accounts[2]) == 0
    assert JoyToken.call().balanceOf(web3.eth.accounts[3]) == 0

    # transfer to acc 2
    JoyToken.transact({ 'from': web3.eth.coinbase }).transfer(web3.eth.accounts[2], 12000);

    # update coinbase balance after second transfer
    coinbase_balance = JoyToken.call().balanceOf(web3.eth.coinbase)
    # checks
    assert coinbase_balance == (JoyToken_supply - 3000 - 12000)
    assert JoyToken.call().balanceOf(web3.eth.accounts[1]) == 3000
    assert JoyToken.call().balanceOf(web3.eth.accounts[2]) == 12000
    assert JoyToken.call().balanceOf(web3.eth.accounts[3]) == 0

    # transfer to acc 3
    JoyToken.transact({ 'from': web3.eth.coinbase }).transfer(web3.eth.accounts[3], 682000);

    # update coinbase balance after second transfer
    coinbase_balance = JoyToken.call().balanceOf(web3.eth.coinbase)
    # checks
    assert coinbase_balance == (JoyToken_supply - 3000 - 12000 - 682000)
    assert JoyToken.call().balanceOf(web3.eth.accounts[1]) == 3000
    assert JoyToken.call().balanceOf(web3.eth.accounts[2]) == 12000
    assert JoyToken.call().balanceOf(web3.eth.accounts[3]) == 682000

    # transfer from acc3 to acc1
    JoyToken.transact({ 'from': web3.eth.accounts[3] }).transfer(web3.eth.accounts[1], 7050);
    assert coinbase_balance == (JoyToken_supply - 3000 - 12000 - 682000)
    assert JoyToken.call().balanceOf(web3.eth.accounts[1]) == (3000 + 7050)
    assert JoyToken.call().balanceOf(web3.eth.accounts[2]) == 12000
    assert JoyToken.call().balanceOf(web3.eth.accounts[3]) == (682000 - 7050)

    # transfer from acc1 back to coinbase
    JoyToken.transact({ 'from': web3.eth.accounts[1] }).transfer(web3.eth.accounts[0], 10050);
    # update coinbase balance after last transfer
    coinbase_balance = JoyToken.call().balanceOf(web3.eth.coinbase)
    assert coinbase_balance == (JoyToken_supply - 3000 - 12000 - 682000 + 10050)
    assert JoyToken.call().balanceOf(web3.eth.accounts[1]) == 0
    assert JoyToken.call().balanceOf(web3.eth.accounts[2]) == 12000
    assert JoyToken.call().balanceOf(web3.eth.accounts[3]) == (682000 - 7050)


def test_failedTransfer(web3, chain):
    # deploy JoyToken from coinbase address
    JoyToken, _ = chain.provider.get_or_deploy_contract('JoyToken')

    failed = False
    try:
        # transfer more than totalSupply
        txhash = JoyToken.transact({ 'from': web3.eth.coinbase }).transfer(web3.eth.accounts[1], JoyToken.call().totalSupply() + 1);
    except TransactionFailed:
        failed = True

    assert failed


def test_transferWithData(web3, chain):
    # deploy JoyToken from coinbase address
    JoyToken, _ = chain.provider.get_or_deploy_contract('JoyToken')
    # get initial token balance == 21000000
    JoyToken_supply = JoyToken.call().totalSupply()

    # transfer all tokens to acc 1, with additional data
    txhash_token = JoyToken.transact({ 'from': web3.eth.coinbase }).transfer(web3.eth.accounts[1], JoyToken_supply, "simple_data");

    receipt = wait_for_transaction_receipt(web3, txhash_token)
    print(receipt)

    eventFilter = JoyToken.pastEvents("ERC223Transfer", {'filter': {'from': web3.eth.coinbase} });
    found_logs = eventFilter.get()

    assert found_logs[0]['args']['data'] == 'simple_data'
