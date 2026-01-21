import { createContext, useContext, useState, ReactNode } from "react";

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  addedBy: "cook" | "admin";
  updatedAt: Date;
}

interface ShoppingListContextType {
  shoppingList: ShoppingItem[];
  addShoppingItem: (name: string, quantity: string, addedBy: "cook" | "admin") => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  getPendingCount: () => number;
  getCompletedCount: () => number;
}

const DemoShoppingListContext = createContext<ShoppingListContextType | null>(null);

const initialShoppingList: ShoppingItem[] = [
  { id: "1", name: "Leite Aptamil HA", quantity: "6 latas", checked: false, addedBy: "cook", updatedAt: new Date() },
  { id: "2", name: "Banana", quantity: "3 kg", checked: true, addedBy: "cook", updatedAt: new Date() },
  { id: "3", name: "Maçã", quantity: "2 kg", checked: false, addedBy: "cook", updatedAt: new Date() },
  { id: "4", name: "Aveia em flocos", quantity: "2 pacotes", checked: false, addedBy: "cook", updatedAt: new Date() },
  { id: "5", name: "Leite de aveia", quantity: "4 caixas", checked: false, addedBy: "admin", updatedAt: new Date() },
];

export function DemoShoppingListProvider({ children }: { children: ReactNode }) {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(initialShoppingList);

  const addShoppingItem = (name: string, quantity: string, addedBy: "cook" | "admin") => {
    if (!name.trim()) return;
    const newItem: ShoppingItem = {
      id: `item-${Date.now()}`,
      name: name.trim(),
      quantity: quantity || "1 un",
      checked: false,
      addedBy,
      updatedAt: new Date(),
    };
    setShoppingList(prev => [...prev, newItem]);
  };

  const toggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked, updatedAt: new Date() } : item
    ));
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const getPendingCount = () => shoppingList.filter(item => !item.checked).length;
  const getCompletedCount = () => shoppingList.filter(item => item.checked).length;

  return (
    <DemoShoppingListContext.Provider
      value={{
        shoppingList,
        addShoppingItem,
        toggleShoppingItem,
        removeShoppingItem,
        getPendingCount,
        getCompletedCount,
      }}
    >
      {children}
    </DemoShoppingListContext.Provider>
  );
}

export function useDemoShoppingList() {
  const context = useContext(DemoShoppingListContext);
  if (!context) {
    throw new Error("useDemoShoppingList must be used within a DemoShoppingListProvider");
  }
  return context;
}
