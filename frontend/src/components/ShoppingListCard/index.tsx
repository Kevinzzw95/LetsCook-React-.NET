import { useState } from "react";
import "./shopping-list-card.scss";
import { ShoppingItem, Unit } from "../../types/ingredient";
import { Check, Circle, MapPin, Pencil, Save, Trash2 } from "lucide-react";
import { useUpdateShoppingItemMutation } from "../../redux/recipe/recipeApiSlice";

interface Props {
    item: ShoppingItem
    updateItem: (id: number, updates: Partial<ShoppingItem>) => void;
    deleteItem: (id: number) => void;
}

const ShoppingListCard = ({item, updateItem, deleteItem}: Props) => {

    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [quantity, setQuantity] = useState<string>(item.amount);
    const [unit, setUnit] =useState<string>(item.unit);
    const [store, setStore] = useState<string>(item.store);
    const [updateShoppingItem] = useUpdateShoppingItemMutation();

    const saveChanges = async() => {
        await updateShoppingItem({
            itemId: item.itemId,
            amount: quantity,
            unit: 'g',
            store: store,
            isBought: item.isBought
        }).then(() => {
            updateItem(item.itemId, { amount: quantity, unit: unit, store: store });
            setIsEditMode(false);
        }).catch(error => {

        });
    }

    const toggleBought = async(item: ShoppingItem) => {
        await updateShoppingItem({
            itemId: item.itemId,
            amount: quantity,
            unit: 'g',
            store: store,
            isBought: !item.isBought
        }).then(() => {
            updateItem(item.itemId, { isBought: !item.isBought });
        })
    };

    return (
        <>
            {/* Checkbox & Name */}
            <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
                <button 
                    onClick={() => toggleBought(item)}
                    className={`bought-button btn p-0 rounded-circle d-flex align-items-center justify-content-center border-2 transition-all flex-shrink-0 ${item.bought ? 'btn-success border-success' : 'btn-outline-secondary border-secondary-subtle'}`}
                >
                    {item.isBought ? <Check size={16} /> : <Circle size={16} className="text-transparent" />}
                </button>
                <img src="../img/Tomato.jpg" className="shopping-list-image object-fit-cover border rounded" alt="" />
                <div>
                    <p className={`m-0 fw-bold text-dark fs-5 ${item.isBought ? 'text-decoration-line-through text-muted' : ''}`}>
                        {item.name}
                    </p>
                </div>
            </div>

            {/* Editable Fields */}
            <div className="d-flex gap-1 gap-md-2 align-items-center justify-content-end">
                {
                    isEditMode ? 
                    <>
                        <div className="input-group input-group-sm qty-input">
                            <input 
                                type="text" 
                                className="form-control border-end-0 bg-white" 
                                value={quantity}
                                onChange={(e) =>setQuantity(e.target.value)}
                                placeholder="Qty"
                            />
                            <span className="input-group-text bg-white text-muted px-2"><small>qty</small></span>
                        </div>

                        <div className="input-group input-group-sm qty-input">
                            <select
                                onChange={(e) => setUnit(e.target.value)}
                                className="form-select"
                                style={{ width: '110px' }}
                                value={unit}
                            >
                            <option value="">Unit</option>
                                {Object.values(Unit).map((u) => (
                                    <option key={u} value={u}>
                                        {u}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group input-group-sm store-input">
                            <span className="input-group-text bg-white text-orange border-end-0 ps-2 pe-1">
                                <MapPin size={14} />
                            </span>
                            <input 
                                type="text" 
                                className="form-control border-start-0 ps-1 bg-white" 
                                value={store}
                                onChange={(e) => setStore(e.target.value)}
                                placeholder="Store..."
                            />
                        </div>
                    </> :
                    <>
                        <div className="">{quantity}</div>
                        <div className="">{unit}</div>
                        {
                            store &&
                            <div className="d-flex align-items-center gap-2">
                                <MapPin className="text-orange" size={14} />
                                {store}
                            </div>
                        }
                        
                    </>
                }

                {
                    isEditMode ? <button 
                        onClick={saveChanges}
                        className="mutation-button btn btn-light text-success hover-bg-danger-subtle rounded-circle p-1 ms-1 d-flex align-items-center justify-content-center"
                    >
                        <Save size={18} />
                    </button> : <button 
                        onClick={() => setIsEditMode(true)}
                        className="mutation-button btn btn-light text-success hover-bg-danger-subtle rounded-circle p-1 ms-1 d-flex align-items-center justify-content-center"
                    >
                        <Pencil size={18} />
                    </button>
                }

                <button 
                    onClick={() => deleteItem(item.itemId)}
                    className="mutation-button btn btn-light text-danger hover-bg-danger-subtle rounded-circle p-1 ms-1 d-flex align-items-center justify-content-center"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </>
    )
}

export default ShoppingListCard; 