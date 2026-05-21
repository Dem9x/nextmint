export function buildIpfsGatewayUrl(gatewayUrl: string, cidOrPath: string, gatewayToken?: string) {
  const cleanPath = cidOrPath.replace(/^ipfs:\/\//, "").replace(/^\/+/, "");
  try {
    const url = new URL(gatewayUrl);
    const ipfsIndex = url.pathname.indexOf("/ipfs");
    const basePath = ipfsIndex >= 0 ? url.pathname.slice(0, ipfsIndex + "/ipfs".length) : url.pathname.replace(/\/$/, "");
    url.pathname = `${basePath.replace(/\/$/, "")}/${cleanPath}`;
    if (gatewayToken && !url.searchParams.has("pinataGatewayToken")) {
      url.searchParams.set("pinataGatewayToken", gatewayToken);
    }
    return url.toString();
  } catch {
    const separator = gatewayUrl.includes("?") ? "&" : "?";
    const tokenQuery = gatewayToken ? `${separator}pinataGatewayToken=${encodeURIComponent(gatewayToken)}` : "";
    return `${gatewayUrl.replace(/\/$/, "")}/${cleanPath}${tokenQuery}`;
  }
}
