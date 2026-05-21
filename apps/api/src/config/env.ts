import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentFile = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(currentFile), "../..");
const repoRoot = path.resolve(apiRoot, "../..");

dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.join(apiRoot, ".env"), override: true });

function runningInDocker() {
  return process.env.RUNNING_IN_DOCKER === "true" || process.env.HOSTNAME?.length === 12;
}

function normalizeLocalServiceUrl(value: string, service: "mongo" | "redis") {
  if (runningInDocker()) return value;
  return value.replace(`://${service}:`, "://localhost:");
}

function optionalUrlWithDefault(defaultValue: string) {
  return z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().url().default(defaultValue));
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://localhost:27017/nexmint")
    .transform((value) => normalizeLocalServiceUrl(value, "mongo")),
  REDIS_URL: z
    .string()
    .min(1)
    .default("redis://localhost:6379")
    .transform((value) => (/^(redis|rediss):\/\//.test(value) ? value : `redis://${value}`))
    .transform((value) => normalizeLocalServiceUrl(value, "redis")),
  JWT_SECRET: z.string().min(32).default("development-only-change-this-secret"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AUTH_NONCE_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  PINATA_JWT: z.string().optional(),
  PINATA_UPLOAD_MODE: z.enum(["auto", "v3", "legacy"]).default("auto"),
  PINATA_NETWORK: z.enum(["public", "private"]).default("public"),
  PINATA_GATEWAY: optionalUrlWithDefault("https://gateway.pinata.cloud/ipfs"),
  PINATA_GATEWAY_URL: optionalUrlWithDefault("https://gateway.pinata.cloud/ipfs"),
  PINATA_GATEWAY_TOKEN: z.string().optional(),
  NFT_STORAGE_TOKEN: z.string().optional(),
  NFT_STORAGE_API_KEY: z.string().optional(),
  NFT_STORAGE_GATEWAY_URL: optionalUrlWithDefault("https://nftstorage.link/ipfs"),
  IPFS_PROVIDER: z.enum(["auto", "pinata", "nft_storage"]).default("auto"),
  UPLOAD_DIR: z.string().default("uploads"),
  REPLICATE_API_TOKEN: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_DEFAULT_MODEL: z.string().default("openrouter/free"),
  OPENROUTER_SITE_URL: z.string().url().default("http://localhost:3000"),
  OPENROUTER_APP_NAME: z.string().default("NEXMINT AI"),
  AI_DEFAULT_IMAGE_PROVIDER: z.enum(["replicate", "huggingface", "flux", "comfyui"]).default("replicate"),
  AI_DEFAULT_TEXT_PROVIDER: z.enum(["openrouter"]).default("openrouter"),
  AI_FREE_TIER_MODE: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
  AI_MAX_DAILY_FREE_REQUESTS: z.coerce.number().int().positive().default(50),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  AI_IMAGE_GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  REPLICATE_DEFAULT_TEXT_TO_IMAGE_MODEL: z.string().default("black-forest-labs/flux-schnell"),
  REPLICATE_DEFAULT_UPSCALE_MODEL: z.string().optional(),
  REPLICATE_DEFAULT_IMAGE_TO_IMAGE_MODEL: z.string().optional(),
  BASE_RPC_URL: z.string().optional(),
  ETHEREUM_RPC_URL: z.string().optional(),
  POLYGON_RPC_URL: z.string().optional(),
  ARBITRUM_RPC_URL: z.string().optional(),
  BNB_RPC_URL: z.string().optional(),
  DEFAULT_CHAIN_ID: z.coerce.number().int().default(84532),
  ENABLE_TESTNET_MODE: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
  BASE_SEPOLIA_RPC_URL: z.string().optional(),
  SEPOLIA_RPC_URL: z.string().optional(),
  ARBITRUM_SEPOLIA_RPC_URL: z.string().optional(),
  BSC_TESTNET_RPC_URL: z.string().optional(),
  BASE_SEPOLIA_PRIVATE_KEY: z.string().optional(),
  SEPOLIA_PRIVATE_KEY: z.string().optional(),
  ARBITRUM_SEPOLIA_PRIVATE_KEY: z.string().optional(),
  BSC_TESTNET_PRIVATE_KEY: z.string().optional(),
  BASE_SEPOLIA_TREASURY_ADDRESS: z.string().optional(),
  SEPOLIA_TREASURY_ADDRESS: z.string().optional(),
  ARBITRUM_SEPOLIA_TREASURY_ADDRESS: z.string().optional(),
  BSC_TESTNET_TREASURY_ADDRESS: z.string().optional(),
  BASE_SEPOLIA_PAYMENT_CONTRACT: z.string().optional(),
  SEPOLIA_PAYMENT_CONTRACT: z.string().optional(),
  ARBITRUM_SEPOLIA_PAYMENT_CONTRACT: z.string().optional(),
  BSC_TESTNET_PAYMENT_CONTRACT: z.string().optional(),
  BASE_SEPOLIA_NFT_FACTORY: z.string().optional(),
  SEPOLIA_NFT_FACTORY: z.string().optional(),
  ARBITRUM_SEPOLIA_NFT_FACTORY: z.string().optional(),
  BSC_TESTNET_NFT_FACTORY: z.string().optional(),
  BASESCAN_API_KEY: z.string().optional(),
  ETHERSCAN_API_KEY: z.string().optional(),
  ARBISCAN_API_KEY: z.string().optional(),
  BSCSCAN_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  COINMARKETCAP_API_KEY: z.string().optional(),
  DEFILLAMA_BASE_URL: z.string().url().default("https://coins.llama.fi"),
  ADMIN_WITHDRAW_ADDRESSES: z.string().optional(),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),
  TREASURY_WALLET: z.string().optional()
});

export const env = schema.parse(process.env);
