import { Schema, model, Types } from "mongoose";

const traitSchema = new Schema(
  {
    collection: { type: Types.ObjectId, ref: "NFTCollection", required: true, index: true },
    layer: { type: String, required: true },
    value: { type: String, required: true },
    rarityTier: { type: String, enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"], required: true },
    weight: { type: Number, required: true, min: 0 },
    supply: { type: Number, default: 0 },
    imagePrompt: String,
    assetUri: String
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

traitSchema.index({ collection: 1, layer: 1, value: 1 }, { unique: true });

export const Trait = model("Trait", traitSchema);
