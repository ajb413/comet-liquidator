# Comet Liquidator powered by Alchemy

A continuously running script that liquidates Compound III accounts that violate collateral requirements.

[Alchemy](https://alchemy.com/?source=compound-comet-liquidator-github) is used to find out the current Comet borrower accounts. [Alchemy Transact](https://docs.alchemy.com/reference/transact-api-quickstart?source=compound-comet-liquidator-github) is used to test the liquidation transactions before they are submitted to the blockchain. Alchemy Notify is used with a [Alchemy Mined Transaction Webhook](https://docs.alchemy.com/reference/mined-transaction-webhook?source=compound-comet-liquidator-github). An [Autocode](https://autocode.com/?source=compound-comet-liquidator-github) webhook listens for the http request and sends an email via SendGrid to the liquidator.

The code in this repository is a fork of the example Comet liquidation bot in the [Comet repository](https://github.com/compound-finance/comet). Find this [Compound Comet Liquidation guide](https://www.comp.xyz/t/the-compound-iii-liquidation-guide/3452) for more details.

## Install

Clone this repository and install Node.js and Yarn.

```
yarn install
yarn build
```

### Alchemy

Get your API keys for **FREE** at [Alchemy.com](https://alchemy.com/?source=compound-comet-liquidator-github).

### Autocode

Set up your Autocode account for **FREE** at [Autocode.com]((https://autocode.com/?source=compound-comet-liquidator-github)). Set up the webhook (`autocode/index.js`) after setting up the [Alchemy Notify Mined Transaction Webhook](https://docs.alchemy.com/reference/mined-transaction-webhook?source=compound-comet-liquidator-github).

### SendGrid

If you want to send email alerts when a transaction is mined, open a SendGrid account for **FREE** at [sendgrid.com](https://sendgrid.com/).

## Liquidator Contract Deployments

The liquidator contract (`./contracts/OnChainLiquidator.sol`) is deployed and verified. Any caller of the contract can initalize a liquidation and receive the resulting excess base asset tokens if a liquidation transaction is successful.

```
arbitrum: '0x18A715c11Cf4ed6A0cf94FCc93a290d4b2d14dD7'
polygon: '0xbf4555f5c127479b225332cd5520cd54c68f814c'
mainnet: '0xC70e2915f019e27BAA493972e4627dbc0ED7a794'
```

## Test Run

This command will run the liquidation bot but it will not try to liquidate borrowers, it will use Alchemy to estimate the arbitrage transaction results using [Alchemy Transact simulation](https://docs.alchemy.com/reference/simulation-asset-changes) (Asset Changes JSON RPC endpoint).

Polygon example:

```
ALCHEMY_KEY="YOUR_ALCHEMY_API_KEY" \
DEPLOYMENT="usdc" \
LIQUIDATOR_ADDRESS="0xbf4555f5c127479b225332cd5520cd54c68f814c" \
USE_FLASHBOTS="false" \
ETH_PK="YOUR_PRIVATE_EVM_ACCOUNT_KEY" \
TESTRUN="true" \
npx hardhat run scripts/liquidation_bot/index.ts --network polygon
```

## Production Run

Same as above, simply remove the `TESTRUN` environment variable.

```
ALCHEMY_KEY="YOUR_ALCHEMY_API_KEY" \
DEPLOYMENT="usdc" \
LIQUIDATOR_ADDRESS="0xbf4555f5c127479b225332cd5520cd54c68f814c" \
USE_FLASHBOTS="false" \
ETH_PK="YOUR_PRIVATE_EVM_ACCOUNT_KEY" \
npx hardhat run scripts/liquidation_bot/index.ts --network polygon
```
