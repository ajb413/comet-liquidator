import hre from 'hardhat';
// import { FlashbotsBundleResolution, FlashbotsTransactionResponse, RelayResponseError } from '@flashbots/ethers-provider-bundle';
import { Signer, PopulatedTransaction } from 'ethers';

// import {SignerWithFlashbots} from './liquidateUnderwaterBorrowers';

// Imports the Alchemy SDK
import { Alchemy, Network } from 'alchemy-sdk';

let network;
if (hre.network.name === 'mainnet') {
  network = Network.ETH_MAINNET;
} else if (hre.network.name === 'polygon') {
  network = Network.MATIC_MAINNET;
} else if (hre.network.name === 'arbitrum') {
  network = Network.ARB_MAINNET;
}

// Configures the Alchemy SDK
const config = {
  apiKey: process.env.ALCHEMY_KEY, // Replace with your API key
  network, // Replace with your network
};

// Creates an Alchemy object instance with the config to use for making requests
const alchemy = new Alchemy(config);

// function isFlashbotsTxnResponse(bundleReceipt: FlashbotsTransactionResponse | RelayResponseError): bundleReceipt is FlashbotsTransactionResponse {
//   return (bundleReceipt as FlashbotsTransactionResponse).bundleTransactions !== undefined;
// }

// async function sendFlashbotsBundle(
//   txn: PopulatedTransaction,
//   // signerWithFlashbots: SignerWithFlashbots
// ): Promise<boolean> {
//   // const wallet = signerWithFlashbots.signer;
//   // const flashbotsProvider = signerWithFlashbots.flashbotsProvider;
//   // const signedBundle = await flashbotsProvider.signBundle(
//   //   [
//   //     {
//   //       signer: wallet, // ethers signer
//   //       transaction: txn // ethers populated transaction object
//   //     }
//   //   ]);
//   // const bundleReceipt = await flashbotsProvider.sendRawBundle(
//   //   signedBundle, // bundle we signed above
//   //   await hre.ethers.provider.getBlockNumber() + 1, // block number at which this bundle is valid
//   // );
//   // let success: boolean;
//   // if (isFlashbotsTxnResponse(bundleReceipt)) {
//   //   const resolution = await bundleReceipt.wait();
//   //   if (resolution === FlashbotsBundleResolution.BundleIncluded) {
//   //     success = true;
//   //     console.log( 'Bundle included!');
//   //   } else if (resolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
//   //     // XXX alert if too many attempts are not included in a block
//   //     success = false;
//   //     console.log( 'Block passed without inclusion');
//   //   } else if (resolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
//   //     success = false;
//   //     console.error( 'Account nonce too high');
//   //   }
//   // } else {
//   //   success = false;
//   //   console.error( `Error while sending Flashbots bundle: ${bundleReceipt.error}`);
//   // }

//   // return success;
// }

// XXX Note: Blocking txn, so we probably want to run these methods in separate threads
export async function sendTxn(
  txn: PopulatedTransaction,
  useFlashbots: Boolean
): Promise<boolean> {
  if (useFlashbots) {
    console.log( 'Sending a private txn via Flashbots');
    await alchemy.transact.sendPrivateTransaction(txn);
  } else {
    console.log( 'Sending a public txn');
    await alchemy.transact.sendTransaction(txn);
  }

  return true;
}

export async function simulateTxWithAlchemyApi(
  txn: PopulatedTransaction,
  from?: string
): Promise<boolean> {
  txn.from = from;
  txn.value = txn.value ? txn.value.toString() : '0x0';

  delete txn.gas;
  delete txn.gasPrice;
  delete txn.gasLimit;
  delete txn.chainId;

  try {
    // console.log(txn);
    const response = await alchemy.transact.simulateAssetChanges(txn);
    console.log('[simulateTxWithAlchemyApi]', response);
    const assets = {};
    response.changes.forEach((c) => {
      if (c.changeType === 'TRANSFER') {
        if (c.from === from.toLowerCase()) {
          assets[c.symbol] = !assets[c.symbol] ? -1 * +c.amount : assets[c.symbol] -= +c.amount;
        }

        if (c.to === from.toLowerCase()) {
          assets[c.symbol] = !assets[c.symbol] ? +c.amount : assets[c.symbol] += +c.amount;
        }
      }
    });
    console.log(from, assets);
  } catch(e) {
    console.log('[simulateTxWithAlchemyApi] error', e);
  }
  return true;
}
