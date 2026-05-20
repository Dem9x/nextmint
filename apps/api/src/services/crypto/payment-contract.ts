export const treasuryPaymentAbi = [
  {
    type: "event",
    name: "PaymentReceived",
    inputs: [
      { name: "paymentId", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "purpose", type: "string", indexed: false }
    ]
  },
  {
    type: "function",
    name: "payNative",
    stateMutability: "payable",
    inputs: [
      { name: "paymentId", type: "bytes32" },
      { name: "purpose", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "payToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "purpose", type: "string" }
    ],
    outputs: []
  }
] as const;
