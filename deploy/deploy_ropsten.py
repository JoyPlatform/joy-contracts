import json

import populus
from populus.utils.wait import wait_for_transaction_receipt
from populus.utils.cli import request_account_unlock
from populus.utils.accounts import is_account_locked
from web3 import Web3

# check if field exist in loaded json file,
# abort when field is missing or when value is not a correct ethereum addres
def require_address(web3, json_data, field):
    print("Checking account address 'AccountAddress." + field + "' field in 'deploy.json' file.")
    if field in json_data["AccountAddress"]:
        if not json_data["AccountAddress"][field]:
            raise ValueError("Require field: 'AccountAddress." + field + "' in your 'deploy.json' file is empty.")
        if not web3.isAddress(json_data["AccountAddress"][field]):
            raise ValueError(json_data["AccountAddress"][field] + " is not a correct eth address. Required for '" + field + "'.")
    else:
        raise ValueError("Not found require field: 'AccountAddress." + field + "' in your 'deploy.json' file.")


# check if field exist in loaded json file,
# return false if field is not given or key-value is empty
# return true if field value is a correct address
def check_contract_field(web3, json_data, field):
    print("Checking contract address 'ContractAddress." + field + "' field in 'deploy.json' file.")
    if field in json_data["ContractAddress"]:
        if not json_data["ContractAddress"][field]:
            return False
        if not web3.isAddress(json_data["ContractAddress"][field]):
            raise ValueError(json_data["ContractAddress"][field]
                + " is not a correct eth address. Required for 'ContractAddress." + field + "'.")
        else:
            return True
    else:
        return False


def if_account_available(web3, acc_address, acc_purpose):
    availble_accounts = web3.personal.listAccounts
    if acc_address not in availble_accounts:
        print("Given address [" + acc_address +
            "] for " + acc_purpose + " is not available from your web3 provider! Aborting..")
        print("Your accounts:")
        i = 0
        for acc in availble_accounts:
            print("\t[" + str(i) + "]: " + acc)
            i += 1
        exit(1)


def deploy_JoyToken(chain, web3, contractOwner):
    print("Deploying JoyToken...")
    JoyToken = chain.provider.get_contract_factory('JoyToken')
    txhash = JoyToken.deploy(transaction={"from":contractOwner})
    print("JoyToken txhash is: ", txhash)
    receipt = wait_for_transaction_receipt(web3, txhash)
    print("JoyToken receipt: ", receipt)
    return receipt["contractAddress"]


def deploy_Deposit(chain, web3, JoyTokenAddress, platformReserve, contractOwner):
    print("Deploying PlatformDeposit...")
    PlatformDeposit = chain.provider.get_contract_factory('PlatformDeposit')
    txhash = PlatformDeposit.deploy(transaction={"from": contractOwner}, args=[JoyTokenAddress, platformReserve])
    print("PlatformDeposit txhash is: ", txhash)
    receipt = wait_for_transaction_receipt(web3, txhash)
    print("PlatformDeposit receipt: ", receipt)
    return receipt["contractAddress"]


def deploy_DemoGame(chain, web3, DepositAddress, gameDeveloper, contractOwner):
    print("Deploying JoyDemoGame...")
    JoyGameDemo = chain.provider.get_contract_factory('JoyGameDemo')
    txhash = JoyGameDemo.deploy(transaction={"from": contractOwner}, args=[DepositAddress, gameDeveloper])
    print("JoyDemoGame txhash is: ", txhash)
    receipt = wait_for_transaction_receipt(web3, txhash)
    print("JoyDemoGame receipt: ", receipt)
    return receipt["contractAddress"]


def deploy_EtherSub(chain, web3, contractOwner):
    print("Deploying SubscriptionWithEther...")
    EtherSub = chain.provider.get_contract_factory('SubscriptionWithEther')
    txhash = EtherSub.deploy(transaction={"from": contractOwner})
    print("SubscriptionWithEther txhash is: ", txhash)
    receipt = wait_for_transaction_receipt(web3, txhash)
    print("SubscriptionWithEther receipt: ", receipt)
    return receipt["contractAddress"]


def deploy_JoySub(chain, web3, JoyTokenAddress, contractOwner):
    print("Deploying SubscriptionWithJoyToken...")
    JoySub = chain.provider.get_contract_factory('SubscriptionWithJoyToken')
    txhash = JoySub.deploy(transaction={"from": contractOwner}, args=[JoyTokenAddress])
    print("SubscriptionWithJoyToken txhash is: ", txhash)
    receipt = wait_for_transaction_receipt(web3, txhash)
    print("SubscriptionWithJoyToken receipt: ", receipt)
    return receipt["contractAddress"]


def deployDemoContracts():
    project = populus.Project()
    chain_name = 'ropsten'

    with project.get_chain(chain_name) as chain:

        web3 = chain.web3
        print("Web3 provider is", web3.providers)

        # loading config file for custom deployment
        with open('deploy/deploy.json', 'r') as conf_json:
            json_data = json.load(conf_json)

            require_address(web3, json_data, "contractsOwner")
            require_address(web3, json_data, "platformReserve")
            require_address(web3, json_data, "gameDeveloper")

            # checking if contract owner is one of the available addresses in web3 provider
            # otherwise there will be not possibile to deploy any contract, and script will be aborted
            contractsOwner = json_data["AccountAddress"]["contractsOwner"]
            if_account_available(web3, contractsOwner, "contracts owner")

            # get other accounts
            platformReserve = json_data["AccountAddress"]["platformReserve"]
            gameDeveloper = json_data["AccountAddress"]["gameDeveloper"]


            # Determine which contracts will be deployed
            givenJoyToken = check_contract_field(web3, json_data, "JoyToken")
            givenDeposit = check_contract_field(web3, json_data, "Deposit")
            givenDemoGame = check_contract_field(web3, json_data, "DemoGame")
            givenEtherSub = check_contract_field(web3, json_data, "SubscriptionWithEther")
            givenJoySub = check_contract_field(web3, json_data, "SubscriptionWithJoyToken")

            print("Contracts status in deploy.json file:"
                + "\n\tJoyToken: " + str(givenJoyToken)
                + "\n\tDeposit: " + str(givenDeposit)
                + "\n\tDemoGame: " + str(givenDemoGame)
                + "\n\tSubscriptionWithEther: " + str(givenEtherSub)
                + "\n\tSubscriptionWithJoyToken: " + str(givenJoySub))

            deployed = {'JoyToken'}
            if not givenJoyToken:
                JoyTokenAddress = deploy_JoyToken(chain, web3, contractsOwner);
                DepositAddress = deploy_Deposit(chain, web3, JoyTokenAddress, platformReserve, contractsOwner);
                DemoGameAddress = deploy_DemoGame(chain, web3, DepositAddress, gameDeveloper, contractsOwner);
                # update json_data
                json_data["ContractAddress"]["JoyToken"] = JoyTokenAddress
                json_data["ContractAddress"]["Deposit"] = DepositAddress
                json_data["ContractAddress"]["DemoGame"] = DemoGameAddress
            elif not givenDeposit:
                JoyTokenAddress = json_data["ContractAddress"]["JoyToken"]
                DepositAddress = deploy_Deposit(chain, web3, JoyTokenAddress, platformReserve, contractsOwner);
                DemoGameAddress = deploy_DemoGame(chain, web3, DepositAddress, gameDeveloper, contractsOwner);
                # update json_data
                json_data["ContractAddress"]["Deposit"] = DepositAddress
                json_data["ContractAddress"]["DemoGame"] = DemoGameAddress
            elif not givenDemoGame:
                DepositAddress = json_data["ContractAddress"]["Deposit"]
                DemoGameAddress = deploy_DemoGame(chain, web3, DepositAddress, gameDeveloper, contractsOwner);
                # update json_data
                json_data["ContractAddress"]["DemoGame"] = DemoGameAddress

            if not givenEtherSub:
                json_data["ContractAddress"]["SubscriptionWithEther"] = deploy_EtherSub(chain, web3, contractsOwner);

            if not givenJoySub:
                JoyTokenAddress = json_data["ContractAddress"]["JoyToken"]
                json_data["ContractAddress"]["SubscriptionWithJoyToken"] = deploy_JoySub(chain, web3, JoyTokenAddress, contractsOwner);

            # saving genrated address to a convenient config.json file (update given deploy.json)
            print('Writing updated changes and generated contract addresses in 'depoly/config.json' file...')
            with open('deploy/config.json', 'w') as fp:
                json.dump(json_data, fp, indent=4)


if __name__ == "__main__":
    deployDemoContracts()
