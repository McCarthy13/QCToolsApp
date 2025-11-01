import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, ProductType, ToleranceSpec, SubProduct } from '../types/product-library';

interface ProductLibraryState {
  products: Product[];

  // CRUD Operations
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  getProductByType: (type: ProductType) => Product | undefined;

  // Sub-Product Operations
  addSubProduct: (productId: string, subProduct: Omit<SubProduct, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSubProduct: (productId: string, subProductId: string, updates: Partial<SubProduct>) => void;
  deleteSubProduct: (productId: string, subProductId: string) => void;
  getSubProduct: (productId: string, subProductId: string) => SubProduct | undefined;

  // Tolerance Operations
  addTolerance: (productId: string, tolerance: ToleranceSpec) => void;
  updateTolerance: (productId: string, toleranceIndex: number, tolerance: ToleranceSpec) => void;
  deleteTolerance: (productId: string, toleranceIndex: number) => void;

  // Sub-Product Tolerance Operations
  addSubProductTolerance: (productId: string, subProductId: string, tolerance: ToleranceSpec) => void;
  updateSubProductTolerance: (productId: string, subProductId: string, toleranceIndex: number, tolerance: ToleranceSpec) => void;
  deleteSubProductTolerance: (productId: string, subProductId: string, toleranceIndex: number) => void;

  // Queries
  getActiveProducts: () => Product[];
  getAllProductTypes: () => ProductType[];

  // Utility
  clearAllProducts: () => void;
  migrateCrossSections: () => void;
  initializeDefaultProducts: () => void;
}

export const useProductLibraryStore = create<ProductLibraryState>()(
  persist(
    (set, get) => ({
      products: [],
      
      // CRUD Operations
      addProduct: (product) => {
        const id = `product-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newProduct: Product = {
          ...product,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          products: [...state.products, newProduct],
        }));
        
        return id;
      },
      
      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? { ...product, ...updates, updatedAt: Date.now() }
              : product
          ),
        }));
      },
      
      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
        }));
      },
      
      getProduct: (id) => {
        return get().products.find((product) => product.id === id);
      },
      
      getProductByType: (type) => {
        return get().products.find((product) => product.name === type);
      },

      // Sub-Product Operations
      addSubProduct: (productId, subProduct) => {
        const subProductId = `subproduct-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newSubProduct: SubProduct = {
          ...subProduct,
          id: subProductId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  subProducts: [...(product.subProducts || []), newSubProduct],
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));

        return subProductId;
      },

      updateSubProduct: (productId, subProductId, updates) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  subProducts: (product.subProducts || []).map((subProduct) =>
                    subProduct.id === subProductId
                      ? { ...subProduct, ...updates, updatedAt: Date.now() }
                      : subProduct
                  ),
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));
      },

      deleteSubProduct: (productId, subProductId) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  subProducts: (product.subProducts || []).filter(
                    (subProduct) => subProduct.id !== subProductId
                  ),
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));
      },

      getSubProduct: (productId, subProductId) => {
        const product = get().products.find((p) => p.id === productId);
        return product?.subProducts?.find((sp) => sp.id === subProductId);
      },

      // Tolerance Operations
      addTolerance: (productId, tolerance) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  tolerances: [...product.tolerances, tolerance],
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));
      },
      
      updateTolerance: (productId, toleranceIndex, tolerance) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  tolerances: product.tolerances.map((t, i) =>
                    i === toleranceIndex ? tolerance : t
                  ),
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));
      },
      
      deleteTolerance: (productId, toleranceIndex) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  tolerances: product.tolerances.filter((_, i) => i !== toleranceIndex),
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));
      },

      // Sub-Product Tolerance Operations
      addSubProductTolerance: (productId, subProductId, tolerance) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  subProducts: (product.subProducts || []).map((subProduct) =>
                    subProduct.id === subProductId
                      ? {
                          ...subProduct,
                          tolerances: [...subProduct.tolerances, tolerance],
                          updatedAt: Date.now(),
                        }
                      : subProduct
                  ),
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));
      },

      updateSubProductTolerance: (productId, subProductId, toleranceIndex, tolerance) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  subProducts: (product.subProducts || []).map((subProduct) =>
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
                }
              : product
          ),
        }));
      },

      deleteSubProductTolerance: (productId, subProductId, toleranceIndex) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  subProducts: (product.subProducts || []).map((subProduct) =>
                    subProduct.id === subProductId
                      ? {
                          ...subProduct,
                          tolerances: subProduct.tolerances.filter((_, i) => i !== toleranceIndex),
                          updatedAt: Date.now(),
                        }
                      : subProduct
                  ),
                  updatedAt: Date.now(),
                }
              : product
          ),
        }));
      },

      // Queries
      getActiveProducts: () => {
        return get().products.filter((product) => product.isActive);
      },
      
      getAllProductTypes: () => {
        return get().products.map((product) => product.name);
      },

      // Utility
      clearAllProducts: () => {
        set({ products: [] });
      },

      // Migration utility to add cross-section components to existing sub-products
      migrateCrossSections: () => {
        set((state) => ({
          products: state.products.map((product) => {
            if (product.name === 'Hollow Core Slabs' && product.subProducts) {
              return {
                ...product,
                subProducts: product.subProducts.map((subProduct) => {
                  // Add cross-section component if missing
                  if (!subProduct.crossSectionComponent) {
                    const componentMap: Record<string, string> = {
                      '8048': 'CrossSection8048',
                      '1048': 'CrossSection1048',
                      '1248': 'CrossSection1248',
                      '1250': 'CrossSection1250',
                      '1648': 'CrossSection1648',
                      '1650': 'CrossSection1650',
                    };

                    return {
                      ...subProduct,
                      crossSectionComponent: componentMap[subProduct.name] || undefined,
                      updatedAt: Date.now(),
                    };
                  }
                  return subProduct;
                }),
                updatedAt: Date.now(),
              };
            }
            return product;
          }),
        }));
      },

      // Migration utility to convert old tolerance format (value) to new format (min/max)
      migrateTolerances: () => {
        set((state) => ({
          products: state.products.map((product) => {
            // Helper function to convert old tolerance to new format
            const convertTolerance = (tolerance: any) => {
              if (tolerance.value && !tolerance.min && !tolerance.max) {
                // Parse old value like "±1/4 inch" or "+1/4, -0"
                const value = tolerance.value.trim();
                let min = '0';
                let max = '0';

                if (value.startsWith('±')) {
                  // Format: "±1/4 inch" -> min: "-1/4"", max: "+1/4""
                  const amount = value.replace('±', '').replace(/\s*inch.*/, '').trim();
                  min = `-${amount}"`;
                  max = `+${amount}"`;
                } else if (value.includes(',')) {
                  // Format: "+1/4, -0" -> min: "0", max: "+1/4""
                  const parts = value.split(',').map(p => p.trim());
                  max = parts[0].includes('+') ? parts[0].replace(/\s*inch.*/, '') + '"' : parts[0] + '"';
                  min = parts[1].includes('-') ? parts[1].replace(/\s*inch.*/, '') + '"' : parts[1] + '"';
                  if (min === '-0"') min = '0';
                }

                return {
                  ...tolerance,
                  min,
                  max,
                  value: undefined, // Remove old field
                };
              }
              return tolerance;
            };

            return {
              ...product,
              tolerances: product.tolerances.map(convertTolerance),
              subProducts: product.subProducts?.map(subProduct => ({
                ...subProduct,
                tolerances: subProduct.tolerances.map(convertTolerance),
              })),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      initializeDefaultProducts: () => {
        const state = get();
        
        if (state.products.length === 0) {
          const defaultProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
            {
              name: 'Beams',
              description: 'Precast concrete beams for structural support',
              tolerances: [
                { dimension: 'Length', min: '-1/2"', max: '+1/2"', notes: 'Overall length tolerance' },
                { dimension: 'Width', min: '-1/4"', max: '+1/4"', notes: 'Cross-section width' },
                { dimension: 'Depth', min: '-1/4"', max: '+1/4"', notes: 'Cross-section depth' },
                { dimension: 'Camber', min: '0', max: '+1/2"', notes: 'Upward deflection' },
              ],
              isActive: true,
            },
            {
              name: 'Hollow Core Slabs',
              description: 'Prestressed hollow core concrete slabs',
              tolerances: [
                { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: 'Standard width tolerance' },
                { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: 'Slab thickness' },
                { dimension: 'Camber', min: '0', max: '+1/4"', notes: 'Maximum upward bow' },
              ],
              subProducts: [
                {
                  id: 'hc-8048',
                  name: '8048',
                  description: '8" thick, 48" wide hollow core slab',
                  deadLoad: '65 psf',
                  fc28Day: 5000,
                  fciRelease: 3500,
                  crossSectionComponent: 'CrossSection8048',
                  tolerances: [
                    { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                    { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: '48" standard width' },
                    { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: '8" nominal thickness' },
                    { dimension: 'Camber', min: '0', max: '+1/4"', notes: 'Maximum upward bow' },
                  ],
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                {
                  id: 'hc-1048',
                  name: '1048',
                  description: '10" thick, 48" wide hollow core slab',
                  deadLoad: '80 psf',
                  fc28Day: 5000,
                  fciRelease: 3500,
                  crossSectionComponent: 'CrossSection1048',
                  tolerances: [
                    { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                    { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: '48" standard width' },
                    { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: '10" nominal thickness' },
                    { dimension: 'Camber', min: '0', max: '+1/4"', notes: 'Maximum upward bow' },
                  ],
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                {
                  id: 'hc-1248',
                  name: '1248',
                  description: '12" thick, 48" wide hollow core slab',
                  deadLoad: '95 psf',
                  fc28Day: 5000,
                  fciRelease: 3500,
                  crossSectionComponent: 'CrossSection1248',
                  tolerances: [
                    { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                    { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: '48" standard width' },
                    { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: '12" nominal thickness' },
                    { dimension: 'Camber', min: '0', max: '+1/4"', notes: 'Maximum upward bow' },
                  ],
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                {
                  id: 'hc-1250',
                  name: '1250',
                  description: '12" thick, 48" wide hollow core slab (thicker webs)',
                  deadLoad: '105 psf',
                  fc28Day: 5000,
                  fciRelease: 3500,
                  crossSectionComponent: 'CrossSection1250',
                  tolerances: [
                    { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                    { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: '48" standard width' },
                    { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: '12" nominal thickness' },
                    { dimension: 'Camber', min: '0', max: '+1/4"', notes: 'Maximum upward bow' },
                  ],
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                {
                  id: 'hc-1648',
                  name: '1648',
                  description: '16" thick, 48" wide hollow core slab',
                  deadLoad: '120 psf',
                  fc28Day: 5000,
                  fciRelease: 3500,
                  crossSectionComponent: 'CrossSection1648',
                  tolerances: [
                    { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                    { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: '48" standard width' },
                    { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: '16" nominal thickness' },
                    { dimension: 'Camber', min: '0', max: '+1/4"', notes: 'Maximum upward bow' },
                  ],
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                {
                  id: 'hc-1650',
                  name: '1650',
                  description: '16" thick, 48" wide hollow core slab (thicker webs)',
                  deadLoad: '130 psf',
                  fc28Day: 5000,
                  fciRelease: 3500,
                  crossSectionComponent: 'CrossSection1650',
                  tolerances: [
                    { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                    { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: '48" standard width' },
                    { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: '16" nominal thickness' },
                    { dimension: 'Camber', min: '0', max: '+1/4"', notes: 'Maximum upward bow' },
                  ],
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ],
              isActive: true,
            },
            {
              name: 'Solid Slabs',
              description: 'Solid precast concrete slabs',
              tolerances: [
                { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Overall length' },
                { dimension: 'Width', min: '-1/8"', max: '+1/8"', notes: 'Overall width' },
                { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: 'Slab thickness' },
              ],
              isActive: true,
            },
            {
              name: 'Stadia',
              description: 'Stadium riser slabs and components',
              tolerances: [
                { dimension: 'Length', min: '-3/8"', max: '+3/8"', notes: 'Overall length' },
                { dimension: 'Width', min: '-1/4"', max: '+1/4"', notes: 'Overall width' },
                { dimension: 'Riser Height', min: '-1/8"', max: '+1/8"', notes: 'Step height tolerance' },
                { dimension: 'Tread Depth', min: '-1/4"', max: '+1/4"', notes: 'Step depth tolerance' },
              ],
              isActive: true,
            },
            {
              name: 'Columns',
              description: 'Precast concrete columns',
              tolerances: [
                { dimension: 'Length', min: '-1/2"', max: '+1/2"', notes: 'Overall height/length' },
                { dimension: 'Cross Section', min: '-1/4"', max: '+1/4"', notes: 'Width and depth' },
                { dimension: 'Plumbness', min: '-1/4"', max: '+1/4"', notes: 'Vertical alignment per 10 ft' },
              ],
              isActive: true,
            },
            {
              name: 'Wall Panels',
              description: 'Architectural and structural wall panels',
              tolerances: [
                { dimension: 'Length', min: '-1/4"', max: '+1/4"', notes: 'Panel length' },
                { dimension: 'Height', min: '-1/4"', max: '+1/4"', notes: 'Panel height' },
                { dimension: 'Thickness', min: '-1/8"', max: '+1/8"', notes: 'Panel thickness' },
                { dimension: 'Squareness', min: '-1/8"', max: '+1/8"', notes: 'Diagonal measurement difference' },
              ],
              isActive: true,
            },
            {
              name: 'Stairs',
              description: 'Precast concrete stair units',
              tolerances: [
                { dimension: 'Length', min: '-1/2"', max: '+1/2"', notes: 'Overall run length' },
                { dimension: 'Width', min: '-1/4"', max: '+1/4"', notes: 'Stair width' },
                { dimension: 'Riser Height', min: '-1/8"', max: '+1/8"', notes: 'Individual step height' },
                { dimension: 'Tread Depth', min: '-1/8"', max: '+1/8"', notes: 'Individual step depth' },
              ],
              isActive: true,
            },
          ];
          
          defaultProducts.forEach((product) => {
            state.addProduct(product);
          });
        }
      },
    }),
    {
      name: 'product-library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
