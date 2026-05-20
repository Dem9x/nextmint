import { Schema, model, Types } from "mongoose";

const contractDeploymentSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    collection: { type: Types.ObjectId, ref: "NFTCollection", required: true, index: true },
    chainId: { type: Number, required: true, index: true },
    contractName: { type: String, required: true },
    contractAddress: { type: String, lowercase: true, index: true },
    constructorArgs: Schema.Types.Mixed,
    txHash: { type: String, index: true },
    status: { type: String, enum: ["queued", "deploying", "deployed", "failed"], default: "queued", index: true },
    explorerUrl: String,
    error: String
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

contractDeploymentSchema.index({ collection: 1, chainId: 1 });

export const ContractDeployment = model("ContractDeployment", contractDeploymentSchema);
