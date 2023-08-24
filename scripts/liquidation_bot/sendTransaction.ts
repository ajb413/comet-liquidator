import hre from 'hardhat';
import { Signer, PopulatedTransaction } from 'ethers';

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

  // Alchemy's API takes care of these
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
