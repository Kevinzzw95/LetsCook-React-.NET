export interface Ingredient {
    amount: string,
    consistency?: string,
    id?: string,
    image?: string,
    name: string,
    unit: Unit | string;
}

export enum Unit {
    GRAMS = 'g',
    KILOGRAMS = 'kg',
    CUPS = 'cups',
    TABLESPOONS = 'tbsp',
    TEASPOONS = 'tsp',
    MILLILITERS = 'ml',
    LITERS = 'l',
    PIECES = 'pcs',
    SLICE = 'slice',
    OUNCE = 'oz',
    POUND = 'lb',
    NONE = '',
}

export interface ShoppingItem {
    itemId: number,
    name: string,
    amount: string,
    store: string,
    unit: string,
    isBought: boolean,
}

export interface ShoppingList {
    id: string,
    userId: string,
    items: ShoppingItem[],
    clientSecret: string
}

export interface updateShoppingItemPayload {
    itemId: number,
    amount: string,
    unit: string,
    store: string,
    isBought: boolean
}