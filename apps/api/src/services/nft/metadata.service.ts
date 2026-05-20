type Attribute = {
  trait_type: string;
  value: string | number;
  display_type?: string;
};

export function createERC721Metadata(input: {
  name: string;
  description: string;
  imageIpfsUri: string;
  attributes?: Attribute[];
  externalUrl?: string;
}) {
  return {
    name: input.name,
    description: input.description,
    image: input.imageIpfsUri,
    external_url: input.externalUrl,
    attributes: input.attributes ?? []
  };
}
