import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  for (const account of await hre.ethers.getSigners()) console.log(account.address);
});

/* note: boolean environment variables are imported as strings */
const {
  ALCHEMY_KEY,
  COINMARKETCAP_API_KEY,
  ETH_PK = '',
  ETHERSCAN_KEY,
  POLYGONSCAN_KEY,
  ARBISCAN_KEY,
  MNEMONIC = 'myth like bonus scare over problem client lizard pioneer submit female collect',
  REPORT_GAS = 'false',
  NETWORK_PROVIDER = '',
  GOV_NETWORK_PROVIDER = '',
  GOV_NETWORK = '',
  REMOTE_ACCOUNTS = ''
} = process.env;

function *deriveAccounts(pk: string, n: number = 10) {
  for (let i = 0; i < n; i++)
    yield (BigInt('0x' + pk) + BigInt(i)).toString(16);
}

export function requireEnv(varName, msg?: string): string {
  const varVal = process.env[varName];
  if (!varVal) {
    throw new Error(msg ?? `Missing required environment variable '${varName}'`);
  }
  return varVal;
}

// required environment variables
// [
  // 'ALCHEMY_KEY',
  // 'ETHERSCAN_KEY',
  // 'POLYGONSCAN_KEY',
  // 'ARBISCAN_KEY',
// ].map(v => requireEnv(v));

// Networks
interface NetworkConfig {
  network: string;
  chainId: number;
  url?: string;
  gas?: number | 'auto';
  gasPrice?: number | 'auto';
}

const networkConfigs: NetworkConfig[] = [
  {
    network: 'mainnet',
    chainId: 1,
    url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  },
  { network: 'goerli', chainId: 5 },
  {
    network: 'polygon',
    chainId: 137,
    url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  },
  {
    network: 'arbitrum',
    chainId: 42161,
    url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  },
];

function getDefaultProviderURL(network: string) {
  return `https://${network}.g.alchemy.com/v2/${ALCHEMY_KEY}`;
}

function setupDefaultNetworkProviders(hardhatConfig: HardhatUserConfig) {
  for (const netConfig of networkConfigs) {
    hardhatConfig.networks[netConfig.network] = {
      chainId: netConfig.chainId,
      url:
        (netConfig.network === GOV_NETWORK ? GOV_NETWORK_PROVIDER : undefined) ||
        NETWORK_PROVIDER ||
        netConfig.url ||
        getDefaultProviderURL(netConfig.network),
      gas: netConfig.gas || 'auto',
      gasPrice: netConfig.gasPrice || 'auto',
      accounts: REMOTE_ACCOUNTS ? 'remote' : ( ETH_PK ? [...deriveAccounts(ETH_PK)] : { mnemonic: MNEMONIC } ),
    };
  }
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.15',
    settings: {
      optimizer: (
        process.env['OPTIMIZER_DISABLED'] ? { enabled: false } : {
          enabled: true,
          runs: 1,
          details: {
            yulDetails: {
              optimizerSteps: 'dhfoDgvulfnTUtnIf [xa[r]scLM cCTUtTOntnfDIul Lcul Vcul [j] Tpeul xa[rul] xa[r]cL gvif CTUca[r]LsTOtfDnca[r]Iulc] jmul[jul] VcTOcul jmul'
            },
          },
        }
      ),
      outputSelection: {
        '*': {
          '*': ['evm.deployedBytecode.sourceMap']
        },
      },
      viaIR: process.env['OPTIMIZER_DISABLED'] ? false : true,
    },
  },

  networks: {
    hardhat: {
      chainId: 1337,
      loggingEnabled: !!process.env['LOGGING'],
      gas: 12000000,
      gasPrice: 'auto',
      blockGasLimit: 12000000,
      accounts: ETH_PK ?
        [...deriveAccounts(ETH_PK)].map(privateKey => ({ privateKey, balance: (10n ** 36n).toString() }))
        : { mnemonic: MNEMONIC, accountsBalance: (10n ** 36n).toString() },
      // this should only be relied upon for test harnesses and coverage (which does not use viaIR flag)
      allowUnlimitedContractSize: true,
      hardfork: 'shanghai'
    },
  },

  // See https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#multiple-api-keys-and-alternative-block-explorers
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_KEY,
      goerli: ETHERSCAN_KEY,
      polygon: POLYGONSCAN_KEY,
      arbitrum: ARBISCAN_KEY,
    },
    customChains: [
      {
        network: 'arbitrum',
        chainId: 42161,
        urls: {
          apiURL: 'https://api.arbiscan.io/api',
          browserURL: 'https://arbiscan.io/'
        }
      },
    ]
  },

  typechain: {
    outDir: 'build/types',
    target: 'ethers-v5',
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false, // allow tests to run anyway
  },

};

setupDefaultNetworkProviders(config);

export default config;
