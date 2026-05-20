import type { NftResultItem } from "@/lib/api/nft";

export function NftAttributesGrid({ attributes }: { attributes: NftResultItem["attributes"] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-5">
      <h3 className="text-xl font-bold">Attributes</h3>
      {!attributes.length ? (
        <p className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">No attributes recorded.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attributes.map((attribute, index) => (
            <div key={`${attribute.trait_type}-${index}`} className="rounded-md border border-cyan/15 bg-cyan/5 p-3">
              <p className="text-xs uppercase text-cyan/80">{attribute.trait_type}</p>
              <p className="mt-1 font-bold">{attribute.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
