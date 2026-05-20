import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

import type { HardhatUserConfig } from "hardhat/config";

const defaultPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

const defaultAccounts = defaultPrivateKey
  ? [defaultPrivateKey]
  : [];

const getAccounts = (privateKey?: string) =>
  privateKey ? [privateKey] : defaultAccounts;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
      viaIR: true,
    },
  },

  networks: {
    // MAINNETS
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "",
      chainId: 1,
      accounts: defaultAccounts,
    },

    base: {
      url: process.env.BASE_RPC_URL || "",
      chainId: 8453,
      accounts: defaultAccounts,
    },

    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      chainId: 137,
      accounts: defaultAccounts,
    },

    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      chainId: 42161,
      accounts: defaultAccounts,
    },

    bnb: {
      url: process.env.BNB_RPC_URL || "",
      chainId: 56,
      accounts: defaultAccounts,
    },

    // TESTNETS
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      chainId: 11155111,
      accounts: getAccounts(process.env.SEPOLIA_PRIVATE_KEY),
    },

    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      chainId: 84532,
      accounts: getAccounts(process.env.BASE_SEPOLIA_PRIVATE_KEY),
    },

    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "",
      chainId: 421614,
      accounts: getAccounts(
        process.env.ARBITRUM_SEPOLIA_PRIVATE_KEY
      ),
    },

    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "",
      chainId: 97,
      accounts: getAccounts(
        process.env.BSC_TESTNET_PRIVATE_KEY
      ),
    },
  },

  etherscan: {
    /*
      ETHERSCAN V2
      ONE API KEY FOR ALL CHAINS
    */
    apiKey: process.env.ETHERSCAN_API_KEY || "",

    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },

      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },

      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
    ],
  },
};

export default config;