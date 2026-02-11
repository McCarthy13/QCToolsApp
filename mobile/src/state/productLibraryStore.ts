import { create } from 'zustand';
import { FirebaseSync } from '../services/firebaseSync';
import { Product, ProductType, ToleranceSpec, SubProduct } from '../types/product-library';

interface ProductLibraryState {
  products: Product[];
  loading: boolean;
  initialized: boolean;

  // CRUD Operations
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProduct: (id: string) => Product | undefined;
  getProductByType: (type: ProductType) => Product | undefined;

  // Sub-Product Operations
  addSubProduct: (productId: string, subProduct: Omit<SubProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSubProduct: (productId: string, subProductId: string, updates: Partial<SubProduct>) => Promise<void>;
  deleteSubProduct: (productId: string, subProductId: string) => Promise<void>;
  getSubProduct: (productId: string, subProductId: string) => SubProduct | undefined;

  // Tolerance Operations
  addTolerance: (productId: string, tolerance: ToleranceSpec) => Promise<void>;
  updateTolerance: (productId: string, toleranceIndex: number, tolerance: ToleranceSpec) => Promise<void>;
  deleteTolerance: (productId: string, toleranceIndex: number) => Promise<void>;

  // Sub-Product Tolerance Operations
  addSubProductTolerance: (productId: string, subProductId: string, tolerance: ToleranceSpec) => Promise<void>;
  updateSubProductTolerance: (productId: string, subProductId: string, toleranceIndex: number, tolerance: ToleranceSpec) => Promise<void>;
  deleteSubProductTolerance: (productId: string, subProductId: string, toleranceIndex: number) => Promise<void>;

  // Queries
  getActiveProducts: () => Product[];
  getAllProductTypes: () => ProductType[];

  // Utility
  clearAllProducts: () => Promise<void>;
  initialize: () => Promise<void>;
}

const firebaseSync = new FirebaseSync<Product>('products');

export const useProductLibraryStore = create<ProductLibraryState>()((set, get) => ({
  products: [],
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const products = await firebaseSync.fetchAll();
      set({ products, loading: false, initialized: true });

      // Subscribe to real-time updates
      firebaseSync.subscribe((updatedProducts) => {
        set({ products: updatedProducts });
      });
    } catch (error) {
      console.error('Failed to initialize products:', error);
      set({ loading: false, initialized: true });
    }
  },

  // CRUD Operations
  addProduct: async (product) => {
    const id = `product-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newProduct: Product = {
      ...product,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: [...state.products, newProduct],
    }));

    try {
      await firebaseSync.set(id, newProduct);
      return id;
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));
      throw error;
    }
  },

  updateProduct: async (id, updates) => {
    const oldProduct = get().products.find((p) => p.id === id);
    const updatedProduct = oldProduct ? { ...oldProduct, ...updates, updatedAt: Date.now() } : null;

    if (!updatedProduct) return;

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === id ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(id, updatedProduct);
    } catch (error) {
      // Revert on error
      if (oldProduct) {
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? oldProduct : p)),
        }));
      }
      throw error;
    }
  },

  deleteProduct: async (id) => {
    const oldProduct = get().products.find((p) => p.id === id);

    // Optimistically update UI
    set((state) => ({
      products: state.products.filter((product) => product.id !== id),
    }));

    try {
      await firebaseSync.delete(id);
    } catch (error) {
      // Revert on error
      if (oldProduct) {
        set((state) => ({
          products: [...state.products, oldProduct],
        }));
      }
      throw error;
    }
  },

  getProduct: (id) => {
    return get().products.find((product) => product.id === id);
  },

  getProductByType: (type) => {
    return get().products.find((product) => product.name === type);
  },

  // Sub-Product Operations
  addSubProduct: async (productId, subProduct) => {
    const subProductId = `subproduct-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newSubProduct: SubProduct = {
      ...subProduct,
      id: subProductId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) throw new Error('Product not found');

    const updatedProduct = {
      ...oldProduct,
      subProducts: [...(oldProduct.subProducts || []), newSubProduct],
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
      return subProductId;
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  updateSubProduct: async (productId, subProductId, updates) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      subProducts: (oldProduct.subProducts || []).map((subProduct) =>
        subProduct.id === subProductId
          ? { ...subProduct, ...updates, updatedAt: Date.now() }
          : subProduct
      ),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  deleteSubProduct: async (productId, subProductId) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      subProducts: (oldProduct.subProducts || []).filter(
        (subProduct) => subProduct.id !== subProductId
      ),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  getSubProduct: (productId, subProductId) => {
    const product = get().products.find((p) => p.id === productId);
    return product?.subProducts?.find((sp) => sp.id === subProductId);
  },

  // Tolerance Operations
  addTolerance: async (productId, tolerance) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      tolerances: [...oldProduct.tolerances, tolerance],
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  updateTolerance: async (productId, toleranceIndex, tolerance) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      tolerances: oldProduct.tolerances.map((t, i) =>
        i === toleranceIndex ? tolerance : t
      ),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  deleteTolerance: async (productId, toleranceIndex) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      tolerances: oldProduct.tolerances.filter((_, i) => i !== toleranceIndex),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  // Sub-Product Tolerance Operations
  addSubProductTolerance: async (productId, subProductId, tolerance) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      subProducts: (oldProduct.subProducts || []).map((subProduct) =>
        subProduct.id === subProductId
          ? {
              ...subProduct,
              tolerances: [...subProduct.tolerances, tolerance],
              updatedAt: Date.now(),
            }
          : subProduct
      ),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  updateSubProductTolerance: async (productId, subProductId, toleranceIndex, tolerance) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      subProducts: (oldProduct.subProducts || []).map((subProduct) =>
        subProduct.id === subProductId
          ? {
              ...subProduct,
              tolerances: subProduct.tolerances.map((t, i) =>
                i === toleranceIndex ? tolerance : t
              ),
              updatedAt: Date.now(),
            }
          : subProduct
      ),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  deleteSubProductTolerance: async (productId, subProductId, toleranceIndex) => {
    const oldProduct = get().products.find((p) => p.id === productId);
    if (!oldProduct) return;

    const updatedProduct = {
      ...oldProduct,
      subProducts: (oldProduct.subProducts || []).map((subProduct) =>
        subProduct.id === subProductId
          ? {
              ...subProduct,
              tolerances: subProduct.tolerances.filter((_, i) => i !== toleranceIndex),
              updatedAt: Date.now(),
            }
          : subProduct
      ),
      updatedAt: Date.now(),
    };

    // Optimistically update UI
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? updatedProduct : product
      ),
    }));

    try {
      await firebaseSync.set(productId, updatedProduct);
    } catch (error) {
      // Revert on error
      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? oldProduct : p)),
      }));
      throw error;
    }
  },

  // Queries
  getActiveProducts: () => {
    return get().products.filter((product) => product.isActive);
  },

  getAllProductTypes: () => {
    return get().products.map((product) => product.name);
  },

  // Utility
  clearAllProducts: async () => {
    const oldProducts = get().products;

    // Optimistically update UI
    set({ products: [] });

    try {
      await Promise.all(oldProducts.map(p => firebaseSync.delete(p.id)));
    } catch (error) {
      // Revert on error
      set({ products: oldProducts });
      throw error;
    }
  },
}));
