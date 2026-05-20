import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeployTreasuryPayment", (m) => {
  const owner = m.getParameter("owner");
  const treasury = m.getParameter("treasury", owner);
  const treasuryPayment = m.contract("TreasuryPayments", [owner, treasury]);
  return { treasuryPayment };
});
