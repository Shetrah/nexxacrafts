import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface CartItem {
  id: string;
  serviceSlug: string;
  serviceName: string;
  configuration: Record<string, string | number | boolean>;
  quantity: number;
  estimate: number | null;
  files: string[];
}
interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  count: number;
}
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'nexxacrafts-cart-v1';
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as CartItem[]; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);
  const value = useMemo(() => ({
    items,
    addItem: (item: CartItem) => setItems(current => [...current, item]),
    removeItem: (id: string) => setItems(current => current.filter(item => item.id !== id)),
    clearCart: () => setItems([]),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
};
