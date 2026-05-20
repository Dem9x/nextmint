import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeployNexmintCollection", (m) => {
  const owner = m.getParameter("owner");
  const royaltyReceiver = m.getParameter("royaltyReceiver", owner);
  const collection = m.contract("NexMintERC721A", [
    m.getParameter("name", "NEXMINT Testnet Collection"),
    m.getParameter("symbol", "NXMT"),
    m.getParameter("maxSupply", 1000),
    owner,
    royaltyReceiver,
    m.getParameter("royaltyBps", 500),
    m.getParameter("hiddenUri", "ipfs://hidden.json")
  ]);
  return { collection };
});
