import hre from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  CometInterface,
  OnChainLiquidator
} from '../../build/types';
import {
  arbitragePurchaseableCollateral,
  liquidateUnderwaterBorrowers,
  getAssets,
  Asset
} from './liquidateUnderwaterBorrowers';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import { Signer, Wallet } from 'ethers';

const loopDelay = 5000;
const loopsUntilUpdateAssets = 1000;
let assets: Asset[] = [];

async function getSigner(address: string): Promise<SignerWithAddress> {
  const signers = await hre.ethers.getSigners();

  if (address) {
    const signer = signers.find(s => s.address.toLowerCase() === address.toLowerCase());
    if (signer) {
      return signer;
    } else {
      throw Error('Signer not found.');
    }
  } else {
    return signers[0];
  }
}

async function main() {
  let { DEPLOYMENT: deployment, LIQUIDATOR_ADDRESS: liquidatorAddress, USE_FLASHBOTS: useFlashbots, ETH_PK: ethPk } = process.env;
  if (!liquidatorAddress) {
    throw new Error('missing required env variable: LIQUIDATOR_ADDRESS');
  }
  if (!deployment) {
    throw new Error('missing required env variable: DEPLOYMENT');
  }
  if (useFlashbots && !ethPk) {
    throw new Error('missing required env variable: ETH_PK');
  }

  const network = hre.network.name;

  console.log(
    `Liquidation Bot started ${JSON.stringify({network, deployment, liquidatorAddress, useFlashbots})}`
  );

  let comet = await hre.ethers.getContractAt("CometInterface", '0xF25212E676D1F7F89Cd72fFEe66158f541246445') as CometInterface;

  // Flashbots provider requires passing in a standard provider
  let flashbotsProvider: FlashbotsBundleProvider;
  let signer: Signer;
  if (useFlashbots && useFlashbots.toLowerCase() === 'true') {
    // XXX use a designated auth signer
    // `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
    // This is an identifying key for signing payloads to establish reputation and whitelisting
    // In production, this should be used across multiple bundles to build relationship. In this example, we generate a new wallet each time
    const authSigner = Wallet.createRandom();

    if (network === 'mainnet') {
      flashbotsProvider = await FlashbotsBundleProvider.create(
        hre.ethers.provider, // a normal ethers.js provider, to perform gas estimations and nonce lookups
        authSigner, // ethers.js signer wallet, only for signing request payloads, not transactions
      );
    } else if (network === 'goerli') {
      flashbotsProvider = await FlashbotsBundleProvider.create(
        hre.ethers.provider, // a normal ethers.js provider, to perform gas estimations and nonce lookups
        authSigner, // ethers.js signer wallet, only for signing request payloads, not transactions
        'https://relay-goerli.flashbots.net',
        'goerli'
      );
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }

    // Note: A `Wallet` is used because it can sign a transaction for flashbots while a generic `Signer` cannot
    // See https://github.com/ethers-io/ethers.js/issues/1869
    signer = new Wallet(ethPk);
  } else {
    signer = await getSigner();
  }

  const signerWithFlashbots = { signer, flashbotsProvider };

  if (!comet) {
    throw new Error(`no deployed Comet found for ${network}/${deployment}`);
  }

  const liquidator = await hre.ethers.getContractAt(
    'OnChainLiquidator',
    liquidatorAddress,
    signer
  ) as OnChainLiquidator;

  let lastBlockNumber: number;
  let loops = 0;
  while (true) {
    if (assets.length == 0 || loops >= loopsUntilUpdateAssets) {
      console.log( 'Updating assets');
      assets = await getAssets(comet);
      loops = 0;
    }

    const currentBlockNumber = await hre.ethers.provider.getBlockNumber();

    console.log( `currentBlockNumber: ${currentBlockNumber}`);

    if (currentBlockNumber !== lastBlockNumber) {
      lastBlockNumber = currentBlockNumber;
      const liquidationAttempted = await liquidateUnderwaterBorrowers(
        comet,
        liquidator,
        signerWithFlashbots,
        network,
        deployment
      );
      if (!liquidationAttempted) {
        await arbitragePurchaseableCollateral(
          comet,
          liquidator,
          assets,
          signerWithFlashbots,
          network,
          deployment
        );
      }
    } else {
      console.log( `block already checked; waiting ${loopDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, loopDelay));
    }

    loops += 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
