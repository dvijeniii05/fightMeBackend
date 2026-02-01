export type ShopItemType = {
  id: number;
  name: string;
  type: string;
  rarity: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  stackable: boolean | null;
  baseStats: unknown;
  requirements: unknown;
  slots: number[];
};

export type InventoryItemType = {
  id: string;
  templateId: number;
  ownerId: string;
  equipped: boolean | null;
  equipSlot: number | null;
  template: ShopItemType;
};
