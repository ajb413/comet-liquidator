import hre from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  CometInterface,
  OnChainLiquidator
} from '../../build/types';
import {
  arbitragePurchaseableCollateral,
  Asset,
  getAssets,
  getUniqueAddresses,
  liquidateUnderwaterBorrowers,
} from './liquidateUnderwaterBorrowers';
// import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import { Signer, Wallet } from 'ethers';
import { Sleuth } from '@compound-finance/sleuth';
import * as liquidatableQuerySol from '../../artifacts/contracts/sleuth-queries/LiquidatableQuery.sol/LiquidatableQuery.json';

const cometAddresses = {
  mainnet: {
    usdc: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    weth: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
  },
  polygon: {
    usdc: '0xF25212E676D1F7F89Cd72fFEe66158f541246445',
  },
  arbitrum: {
    usdc: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
  },
};

const loopDelay = 20000;
const loopsUntilDataRefresh = 1000;
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
  // if (useFlashbots && !ethPk) {
  if (!ethPk) {
    throw new Error('missing required env variable: ETH_PK');
  }

  const network = hre.network.name;

  console.log(
    `Liquidation Bot started ${JSON.stringify({network, deployment, liquidatorAddress, useFlashbots})}`
  );

  const cometAddress = cometAddresses[hre.network.name][process.env.DEPLOYMENT];
  let comet = await hre.ethers.getContractAt("CometInterface", cometAddress) as CometInterface;

  // Flashbots provider requires passing in a standard provider
  // let flashbotsProvider: FlashbotsBundleProvider;
  let signer: Signer;
  // if (useFlashbots && useFlashbots.toLowerCase() === 'true') {
  //   // XXX use a designated auth signer
  //   // `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
  //   // This is an identifying key for signing payloads to establish reputation and whitelisting
  //   // In production, this should be used across multiple bundles to build relationship. In this example, we generate a new wallet each time
  //   const authSigner = Wallet.createRandom();

  //   if (network === 'mainnet') {
  //     flashbotsProvider = await FlashbotsBundleProvider.create(
  //       hre.ethers.provider, // a normal ethers.js provider, to perform gas estimations and nonce lookups
  //       authSigner, // ethers.js signer wallet, only for signing request payloads, not transactions
  //     );
  //   } else if (network === 'goerli') {
  //     flashbotsProvider = await FlashbotsBundleProvider.create(
  //       hre.ethers.provider, // a normal ethers.js provider, to perform gas estimations and nonce lookups
  //       authSigner, // ethers.js signer wallet, only for signing request payloads, not transactions
  //       'https://relay-goerli.flashbots.net',
  //       'goerli'
  //     );
  //   } else {
  //     throw new Error(`Unsupported network: ${network}`);
  //   }

  //   // Note: A `Wallet` is used because it can sign a transaction for flashbots while a generic `Signer` cannot
  //   // See https://github.com/ethers-io/ethers.js/issues/1869
  //   signer = new Wallet(ethPk);
  // } else {
  //   signer = await getSigner();
  // }

  // const signerWithFlashbots = { signer, flashbotsProvider };

  // signer

  if (!comet) {
    throw new Error(`no deployed Comet found for ${network}/${deployment}`);
  }

  let sleuth = new Sleuth(hre.ethers.provider);
  // Hardhat's output seems to not match Forge's, but it's a small tweak
  let liquidatableQuerySolFixed = {
    ...liquidatableQuerySol,
    evm: { bytecode: { object: liquidatableQuerySol.bytecode } }
  };
  let liquidatableQuery = await Sleuth.querySol<[string, string[]], [string[]]>(liquidatableQuerySolFixed);

  const liquidator = await hre.ethers.getContractAt(
    'OnChainLiquidator',
    liquidatorAddress,
    signer
  ) as OnChainLiquidator;

  let lastAddressRefresh: number | undefined;
  let uniqueAddresses: Set<string> = new Set();

  for (let loops = 0; true; loops++) {
    if (assets.length == 0 || loops >= loopsUntilDataRefresh) {
      console.log( 'Updating assets');
      assets = await getAssets(comet);
      // uniqueAddresses = await getUniqueAddresses(comet);
      // uniqueAddresses = ['0x8E52Bf63cBa543592c581CB4Bc1D56aD96fb62F4'];
      uniqueAddresses = ['0x3e82001810FB6Ac50DE73bcaA2F70d84D70aFD42'];
      loops = 0;
    }

    // console.log( `currentBlockNumber: ${currentBlockNumber}`);

    // Note, the first time is effectively a nop
    const [blockNumber, liquidationAttempted] = await liquidateUnderwaterBorrowers(
      uniqueAddresses,
      sleuth,
      liquidatableQuery,
      comet,
      liquidator,
      network,
      deployment
    );

    if (!liquidationAttempted) {
      await arbitragePurchaseableCollateral(
          comet,
          liquidator,
          assets,
          network,
          deployment
        );
    }
    await new Promise(resolve => setTimeout(resolve, loopDelay));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
