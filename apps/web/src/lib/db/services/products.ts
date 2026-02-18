/**
 * Offline-First CRUD Service for Products
 * Implements Dexie-first approach with automatic sync to Firebase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Product } from '@/lib/types';
import type { ProductFormValues } from '@/components/products/add-edit-product-dialog';
import { getFirebaseProducts } from '@/lib/firebase/services/products';

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

    // 1. Save to local database immediately
    await db.products.add(product);

    // 2. Add to sync queue
    await syncService.addToQueue('product', 'create', id, productData);

    // console.log(`✅ Product added locally: ${product.name}`);
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

    // 1. Update local database
    await db.products.put(updatedProduct);

    // 2. Add to sync queue
    await syncService.addToQueue('product', 'update', id, productData);

    // console.log(`✅ Product updated locally: ${updatedProduct.name}`);
}

/**
 * Delete a product (offline-first)
 */
export async function deleteProduct(id: string): Promise<void> {
    // 1. Delete from local database
    await db.products.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('product', 'delete', id, null);

    // console.log(`✅ Product deleted locally: ${id}`);
}

/**
 * Sync products from Firebase to local database
 */
export async function syncProductsFromFirebase(): Promise<number> {
    try {
        const firebaseProducts = await getFirebaseProducts();

        // Clear local products and replace with Firebase data
        await db.products.clear();
        await db.products.bulkAdd(firebaseProducts);

        // console.log(`✅ Synced ${firebaseProducts.length} products from Firebase`);
        return firebaseProducts.length;
    } catch (error) {
        console.error('❌ Failed to sync products from Firebase:', error);
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
 * Get all unique product categories
 */
export async function getUniqueProductCategories(): Promise<string[]> {
    const products = await db.products.toArray();
    return [...new Set(products.map(p => p.category).filter(Boolean))].sort();
}

/**
 * Get products count
 */
export async function getProductsCount(): Promise<number> {
    return await db.products.count();
}

/**
 * Get products by category (for analytics)
 */
export async function getProductsByCategory(): Promise<Record<string, number>> {
    const products = await db.products.toArray();
    const categoryCounts: Record<string, number> = {};

    products.forEach(product => {
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
