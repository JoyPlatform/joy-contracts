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


def check_subscription_contract_field(web3, json_data, field):
    print("Checking subscription contract address 'ContractAddress.subscription." + field + "' field in 'deploy.json' file.")
    if field in json_data["ContractAddress"]:
        if not json_data["ContractAddress"]["subscription"][field]:
            return False
        if not web3.isAddress(json_data["ContractAddress"]["subscription"][field]):
            raise ValueError(json_data["ContractAddress"]["subscription"][field]
                + " is not a correct eth address. Required for 'ContractAddress.subscription." + field + "'.")
        else:
            return True
    else:
        return False


def if_account_available(web3, acc_address, acc_purpose):
    availble_accounts = web3.personal.listAccounts
    found = False
    for acc in availble_accounts:
        # addresses need to be converted to same the format. (checksum addresses prevents lower/upper case problems)
        if web3.toChecksumAddress(acc) == web3.toChecksumAddress(acc_address):
            found = True

    if not found:
        print("Given address [" + acc_address +
            "] for " + acc_purpose + " is not available from your web3 provider! Aborting..")
        print("Your accounts:")
        i = 0
        for acc in availble_accounts:
            print("\t[" + str(i) + "]: " + acc)
            i += 1
        exit(1)

def deploy_contract(contractName, chain, contractOwner, *deploy_args):
    print("Deploying " + contractName + "...")
    contract = chain.provider.get_contract_factory(contractName)
    txhash = contract.deploy(transaction={"from":contractOwner}, args=deploy_args)
    print(contractName + " txhash is: ", txhash)
    receipt = wait_for_transaction_receipt(chain.web3, txhash)
    print(contractName + " receipt: ", receipt)
    return receipt["contractAddress"]


# deploy JoyToken and update json_data
def deploy_JoyToken(chain, contractOwner, json_data):
    newJoyTokenAddress = deploy_contract("JoyToken", chain, contractOwner)
    json_data["ContractAddress"]["joyToken"] = newJoyTokenAddress


# deploy Deposit and update json_data
def deploy_Deposit(chain, contractOwner, json_data):
    JoyTokenAddress = json_data["ContractAddress"]["joyToken"]
    platformReserve = json_data["AccountAddress"]["platformReserve"]
    newDepositAddress = deploy_contract("PlatformDeposit", chain, contractOwner, JoyTokenAddress, platformReserve)
    json_data["ContractAddress"]["deposit"] = newDepositAddress


# deploy DemoGame and update json_data
def deploy_DemoGame(chain, contractOwner, json_data):
    DepositAddress = json_data["ContractAddress"]["deposit"];
    gameDeveloper = json_data["AccountAddress"]["gameDeveloper"]
    newDemoGameAddress = deploy_contract("JoyGameDemo", chain, contractOwner, DepositAddress, gameDeveloper)
    json_data["ContractAddress"]["demoGame"] = newDemoGameAddress


# deploy SubscriptionWithEther and update json_data
def deploy_EtherSub(chain, contractOwner, json_data):
    newEtherSubAddress = deploy_contract("SubscriptionWithEther", chain, contractOwner)
    json_data["ContractAddress"]["subscription"]["ether"] = newEtherSubAddress


# deploy SubscriptionWithJoyToken and update json_data
def deploy_JoySub(chain, contractOwner, json_data):
    JoyTokenAddress = json_data["ContractAddress"]["joyToken"]
    newJoySubAddress = deploy_contract("SubscriptionWithJoyToken", chain, contractOwner, JoyTokenAddress)
    json_data["ContractAddress"]["subscription"]["joyToken"] = newJoySubAddress


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
            givenJoyToken = check_contract_field(web3, json_data, "joyToken")
            givenDeposit = check_contract_field(web3, json_data, "deposit")
            givenDemoGame = check_contract_field(web3, json_data, "demoGame")

            givenEtherSub = check_subscription_contract_field(web3, json_data, "ether")
            givenJoySub = check_subscription_contract_field(web3, json_data, "joyToken")

            print("Contracts status in deploy.json file:"
                + "\n\tJoyToken: " + str(givenJoyToken)
                + "\n\tDeposit: " + str(givenDeposit)
                + "\n\tDemoGame: " + str(givenDemoGame)
                + "\n\tSubscription with Ether: " + str(givenEtherSub)
                + "\n\tSubscription with JoyToken: " + str(givenJoySub))


            if not givenJoyToken:
                deploy_JoyToken(chain, contractsOwner, json_data);
                deploy_Deposit(chain, contractsOwner, json_data);
                deploy_DemoGame(chain, contractsOwner, json_data);
            elif not givenDeposit:
                deploy_Deposit(chain, contractsOwner, json_data);
                deploy_DemoGame(chain, contractsOwner, json_data);
            elif not givenDemoGame:
                deploy_DemoGame(chain, contractsOwner, json_data);

            if not givenEtherSub:
                deploy_EtherSub(chain, contractsOwner, json_data);

            if not givenJoySub:
                deploy_JoySub(chain, contractsOwner, json_data);

            # saving genrated address to a convenient config.json file (update given deploy.json)
            print("Writing updated changes and generated contract addresses in 'deploy/config.json' file...")
            with open('deploy/config.json', 'w') as fp:
                json.dump(json_data, fp, indent=4)


if __name__ == "__main__":
    deployDemoContracts()
