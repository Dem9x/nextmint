import { Schema, model } from "mongoose";

const contractAddressSchema = new Schema(
  {
    chainId: { type: Number, required: true, index: true },
    chainSlug: { type: String, required: true, index: true },
    contractName: { type: String, required: true, index: true },
    address: { type: String, required: true, lowercase: true },
    deploymentTxHash: { type: String, lowercase: true },
    explorerUrl: String,
    isTestnet: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

contractAddressSchema.index({ chainId: 1, contractName: 1 }, { unique: true });
contractAddressSchema.index({ chainId: 1, address: 1 });

export const ContractAddress = model("ContractAddress", contractAddressSchema);
