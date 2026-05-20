export function buildIpfsGatewayUrl(gatewayUrl: string, cidOrPath: string) {
  const cleanPath = cidOrPath.replace(/^ipfs:\/\//, "").replace(/^\/+/, "");
  try {
    const url = new URL(gatewayUrl);
    const ipfsIndex = url.pathname.indexOf("/ipfs");
    const basePath = ipfsIndex >= 0 ? url.pathname.slice(0, ipfsIndex + "/ipfs".length) : url.pathname.replace(/\/$/, "");
    url.pathname = `${basePath.replace(/\/$/, "")}/${cleanPath}`;
    return url.toString();
  } catch {
    return `${gatewayUrl.replace(/\/$/, "")}/${cleanPath}`;
  }
}
