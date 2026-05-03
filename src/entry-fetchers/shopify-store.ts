import {EntryFetcher} from "@/src/entry-fetchers";
import {BaseUpdate, UpdateType} from "@/src/updates";
import {ShopifyProductsResponseSchema} from "@/src/zod-schemas/shopify";

export interface ShopifyStoreOptions {
    origin: string;
    collectionHandle?: string;
    updateType: UpdateType.MUSEMU_STORE | UpdateType.WARNER_AU_STORE | UpdateType.WARNER_CA_STORE;
}

type ShopifyStoreUpdate = BaseUpdate & {
    title: string;
    url: string;
    image_url: string;
}

export class ShopifyStore implements EntryFetcher
{
    private readonly perPage = 250;
    private readonly maxPages = 20;

    constructor(private readonly options: ShopifyStoreOptions) {}

    async fetch(): Promise<ShopifyStoreUpdate[]>
    {
        const results: ShopifyStoreUpdate[] = [];

        for (let page = 1; page <= this.maxPages; page++) {
            const url = new URL(this.productsJsonPath(), this.options.origin);
            url.searchParams.set('limit', String(this.perPage));
            url.searchParams.set('page', String(page));

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const data = ShopifyProductsResponseSchema.parse(await response.json());

            if (data.products.length === 0) {
                break;
            }

            for (const product of data.products) {
                const imageUrl = product.images[0]?.src;

                if (!imageUrl) {
                    throw new Error(`Missing image for product: ${JSON.stringify({id: product.id, title: product.title})}`);
                }

                results.push({
                    type: this.options.updateType,
                    uniqueId: String(product.id),
                    id: String(product.id),
                    title: product.title,
                    url: new URL(`/products/${product.handle}`, this.options.origin).href,
                    image_url: imageUrl,
                });
            }

            if (data.products.length < this.perPage) {
                break;
            }
        }

        return results;
    }

    private productsJsonPath(): string
    {
        return this.options.collectionHandle
            ? `/collections/${this.options.collectionHandle}/products.json`
            : '/products.json';
    }
}
