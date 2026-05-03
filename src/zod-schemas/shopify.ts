import {z} from "zod";

export const ShopifyProductImageSchema = z.object({
    src: z.string(),
});

export const ShopifyProductSchema = z.object({
    id: z.number(),
    title: z.string(),
    handle: z.string(),
    images: z.array(ShopifyProductImageSchema),
});

export const ShopifyProductsResponseSchema = z.object({
    products: z.array(ShopifyProductSchema),
});
