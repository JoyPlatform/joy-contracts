
# test basic properties of DToken
def test_DToken(chain):
    DToken, _ = chain.provider.get_or_deploy_contract('DToken')

    DToken_name = DToken.call().name()
    assert DToken_name == "DToken"

    DToken_symbol = DToken.call().symbol()
    assert DToken_symbol == "DTN"

    DToken_decimals = DToken.call().decimals()
    assert DToken_decimals == 4

    DToken_supply = DToken.call().totalSupply()
    assert DToken_supply == 210 * (10 ** DToken_decimals)

