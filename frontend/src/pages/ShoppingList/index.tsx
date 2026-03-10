
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, MapPin, Check, Circle, ShoppingCart, ShoppingBag, Pencil, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ShoppingItem } from '../../types/ingredient';
import './shopping-list.scss';
import ShoppingListCard from '../../components/ShoppingListCard';
import { useGetShoppingListQuery } from '../../redux/recipe/recipeApiSlice';

const ShoppingList = () => {
    const [activeTab, setActiveTab] = useState<'to-buy' | 'bought'>('to-buy');
    const [filterStore, setFilterStore] = useState('All');
    const [items, setItems] = useState<ShoppingItem[]>();
    const { data: shoppingList, error, isLoading, isFetching, refetch } = useGetShoppingListQuery();
    
    useEffect(() => {
        setItems(shoppingList?.items);
    }, [shoppingList]);

    // Get unique stores from items for the filter dropdown
    const uniqueStores = items && ['All', ...Array.from(new Set(items.map(item => item.store).filter(store => store && store.trim() !== '')))];

    const filteredItems = items && items.filter(item => {
        const matchesTab = activeTab === 'to-buy' ? !item.isBought : item.isBought;
        const matchesStore = filterStore === 'All' || item.store === filterStore;
        return matchesTab && matchesStore;
    });

    const [newItemName, setNewItemName] = useState('');

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        const newItem: ShoppingItem = {
            name: newItemName,
            amount: '1',
            store: '',
            isBought: false,
            unit: "g"
        };
        setNewItemName('');
        setActiveTab('to-buy');
    };

    const updateItem = (id: number, updates: Partial<ShoppingItem>) => {
        setItems(items.map(item => item.itemId === id ? { ...item, ...updates } : item));
    };

    const deleteItem = (id: number) => {
        setItems(items.filter(item => item.itemId !== id));
    };

    return (
        <div className="container py-4 animate-fade-in">
        
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 gap-3">
                <div className="text-center text-md-start">
                    <h1 className="h2 fw-bold text-dark d-flex align-items-center gap-2 justify-content-center justify-content-md-start">
                        <div className="icon-circle bg-orange-light text-orange rounded-circle">
                            <ShoppingBag size={24} />
                        </div>
                        Shopping List
                    </h1>
                    <p className="text-secondary m-0">Manage your grocery run efficiently</p>
                </div>

                {/* Add Item Input */}
                <form onSubmit={addItem} className="d-flex gap-2 w-100" style={{ maxWidth: '400px' }}>
                    <input 
                        type="text" 
                        className="form-control rounded-pill px-4 shadow-sm border-0" 
                        placeholder="Add new item (e.g., Milk)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <button type="submit" className="btn btn-sunny rounded-circle p-2 shadow-sm flex-shrink-0" style={{ width: '42px', height: '42px' }}>
                        <Plus size={20} />
                    </button>
                </form>
            </div>

            {/* Tabs */}
            {
                items && 
                <>
                    <div className="d-flex justify-content-center mb-4">
                        <div className="bg-white p-1 rounded-pill shadow-sm d-inline-flex border">
                            <button 
                                onClick={() => setActiveTab('to-buy')}
                                className={`btn rounded-pill px-4 py-2 fw-medium transition-all ${activeTab === 'to-buy' ? 'btn-sunny shadow-sm' : 'text-secondary hover-bg-light'}`}
                            >
                                To Buy ({items.filter(i => !i.isBought && ((filterStore !== 'All' && filterStore === i.store) || filterStore === 'All')).length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('bought')}
                                className={`btn rounded-pill px-4 py-2 fw-medium transition-all ${activeTab === 'bought' ? 'bg-success text-white shadow-sm' : 'text-secondary hover-bg-light'}`}
                            >
                                Already Bought ({items.filter(i => i.isBought && ((filterStore !== 'All' && filterStore === i.store) || filterStore === 'All')).length})
                            </button>
                        </div>
                    </div>

                    {/* Filter Section */}
                    {
                        uniqueStores && 
                        <div className="d-flex justify-content-end mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <Filter size={16} className="text-secondary" />
                                <select 
                                    value={filterStore} 
                                    onChange={(e) => setFilterStore(e.target.value)}
                                    className="form-select form-select-sm border-0 shadow-sm bg-white text-secondary fw-medium"
                                    style={{ width: 'auto', minWidth: '150px' }}
                                >
                                    {uniqueStores.map(store => (
                                        <option key={store} value={store}>
                                            {store === 'All' ? 'All Stores' : store}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    }

                    {/* List Area */}
                    {
                        filteredItems && 
                        <div className="d-flex flex-column gap-3">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-5 opacity-50">
                                    <ShoppingCart size={48} className="text-secondary mb-3" />
                                    <p className="h5 text-muted">No items in this list.</p>
                                </div>
                            ) : (
                                filteredItems.map(item => (
                                    <div key={item.itemId} className="card-glass py-2 px-3 d-flex flex-column flex-md-row gap-3 align-items-md-center animate-fade-in">
                                        <ShoppingListCard item={item} updateItem={updateItem} deleteItem={deleteItem}/>
                                    </div>
                                ))
                            )}
                        </div>
                    }
                </>
            }
        </div>
    );
};

export default ShoppingList;
