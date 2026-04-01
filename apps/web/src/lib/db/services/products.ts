/**
 * Offline-First CRUD Service for Products
 * Implements Dexie-first approach with automatic sync to Supabase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Product } from '@/lib/types';
import type { ProductFormValues } from '@/components/products/add-edit-product-dialog';
import { getSupabaseProducts } from '@/lib/supabase/services/products';

/**
 * Get all products from local database
 */
export async function getAllProducts(): Promise<Product[]> {
    return await db.products.toArray();
}

/**
 * Get a single product by ID from local database
 */
export async function getProduct(id: string): Promise<Product | undefined> {
    return await db.products.get(id);
}

/**
 * Get simple product options for dropdowns and selectors
 */
export async function getProductOptions(): Promise<Pick<Product, 'id' | 'name' | 'category' | 'price' | 'quantity'>[]> {
    return await db.products
        .filter(p => !p.deleted)
        .toArray(products => products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            quantity: p.quantity,
        })));
}

/**
 * Get products with pagination
 */
export async function getPaginatedProducts(page: number, pageSize: number): Promise<{ data: Product[], total: number }> {
    const total = await db.products.count();
    const data = await db.products
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
    return { data, total };
}

/**
 * Get products with filters
 */
export async function getProductsFiltered(filters: {
    category?: string;
    supplierId?: string;
}): Promise<Product[]> {
    let collection = db.products.toCollection();

    if (filters.category) {
        collection = db.products.where('category').equals(filters.category);
    }
    if (filters.supplierId) {
        collection = collection.and(p => p.supplierId === filters.supplierId);
    }

    return await collection.toArray();
}

/**
 * Add a new product (offline-first)
 */
export async function addProduct(
    productData: ProductFormValues,
    id: string
): Promise<void> {
    const now = new Date().toISOString();

    const product: Product = {
        id,
        name: productData.name,
        category: productData.category,
        supplierId: productData.supplierId,
        quantity: productData.quantity,
        price: productData.price,
        createdAt: now,
        updatedAt: now,
    };

    await syncService.writeAndEnqueue(
        db.products,
        () => db.products.add(product),
        'product', 'create', id, productData
    );
}

/**
 * Update an existing product (offline-first)
 */
export async function updateProduct(
    id: string,
    productData: Partial<ProductFormValues>
): Promise<void> {
    const now = new Date().toISOString();

    // Get existing product
    const existingProduct = await db.products.get(id);
    if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
    }

    // Merge updates
    const safeUpdates = productData;

    const updatedProduct: Product = {
        ...existingProduct,
        ...safeUpdates,
        updatedAt: now,
    };

    await syncService.writeAndEnqueue(
        db.products,
        () => db.products.put(updatedProduct),
        'product', 'update', id, productData
    );
}

/**
 * Delete a product (offline-first)
 */
export async function deleteProduct(id: string): Promise<void> {
    const existing = await db.products.get(id);

    await syncService.writeAndEnqueue(
        db.products,
        () => db.products.delete(id),
        'product', 'delete', id, null
    );
}

/**
 * Sync products from Supabase to local database (delta sync)
 */
export async function syncProductsFromSupabase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_products');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        // Capture start time BEFORE the query to avoid race conditions
        const syncStartTime = Date.now();

        let hasMore = true;
        let offset = 0;
        const chunkSize = 1000;
        let totalSynced = 0;

        while (hasMore) {
            const result = await import('@/lib/supabase/services/products').then(m => m.getSupabaseProductsPaginated(lastSyncTime, offset, chunkSize));
            const supabaseProducts = result.products;
            hasMore = result.hasMore;

            if (supabaseProducts.length > 0) {
                const productsToPut: Product[] = [];
                const idsToDelete: string[] = [];

                for (const product of supabaseProducts as (Product & { deleted?: boolean })[]) {
                    if (product.deleted) {
                        idsToDelete.push(product.id);
                    } else {
                        delete product.deleted;
                        productsToPut.push(product);
                    }
                }

                if (productsToPut.length > 0) {
                    await db.products.bulkPut(productsToPut);
                }

                if (idsToDelete.length > 0) {
                    await db.products.bulkDelete(idsToDelete);
                }

                totalSynced += supabaseProducts.length;

                // Yield to main thread to prevent UI freezing
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            offset += chunkSize;
        }

        localStorage.setItem('lastSync_products', syncStartTime.toString());

        return totalSynced;
    } catch (error) {
        console.error('❌ Failed to sync products from Supabase:', error);
        throw error;
    }
}

/**
 * Get products with pagination AND filtering
 */
export async function getProductsPaginatedAndFiltered(
    page: number,
    pageSize: number,
    filters: {
        search?: string;
        category?: string;
        supplierId?: string;
        stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
    }
): Promise<{ data: Product[]; total: number }> {
    let all = await db.products.toArray();

    if (filters.search) {
        const q = filters.search.toLowerCase();
        all = all.filter(p => p.name.toLowerCase().includes(q));
    }
    if (filters.category) {
        all = all.filter(p => p.category === filters.category);
    }
    if (filters.supplierId) {
        all = all.filter(p => p.supplierId === filters.supplierId);
    }
    if (filters.stockStatus === 'out_of_stock') {
        all = all.filter(p => p.quantity === 0);
    } else if (filters.stockStatus === 'low_stock') {
        all = all.filter(p => p.quantity > 0 && p.quantity < 10);
    } else if (filters.stockStatus === 'in_stock') {
        all = all.filter(p => p.quantity >= 10);
    }

    const total = all.length;
    const data = all.slice((page - 1) * pageSize, page * pageSize);
    return { data, total };
}

/**
 * Get all unique product categories (Memory-Optimized using DB Indices)
 */
export async function getUniqueProductCategories(): Promise<string[]> {
    const categories = await db.products.orderBy('category').uniqueKeys() as string[];
    return categories.filter(c => c && c.trim().length > 0).sort();
}

/**
 * Get products count
 */
export async function getProductsCount(): Promise<number> {
    return await db.products.count();
}

/**
 * Get products by category (Memory-Optimized using Cursors)
 */
export async function getProductsByCategory(): Promise<Record<string, number>> {
    const categoryCounts: Record<string, number> = {};
    await db.products.each(product => {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    });
    return categoryCounts;
}

/**
 * Get low stock products (quantity < 10)
 */
export async function getLowStockProducts(): Promise<Product[]> {
    return await db.products
        .filter(product => product.quantity < 10)
        .toArray();
}
