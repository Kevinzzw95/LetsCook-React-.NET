import { useEffect, useRef, useState } from 'react';
import './ingredient-editor.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useFormContext, useFieldArray, Control, UseFormRegister } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { RecipeDraft } from '../../../types/recipe';
import { Ingredient, Unit } from '../../../types/ingredient';
import { v4 as uuidv4 } from 'uuid';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

type Props = {
    currRecipe: RecipeDraft;
    updateData: (updates: Partial<RecipeDraft>) => void;
    control: Control<RecipeDraft>;
    register: UseFormRegister<RecipeDraft>;
}

const IngredientsEditor = ({currRecipe, updateData, control, register}: Props) => {
    const { formState: { errors }} = useFormContext<RecipeDraft>();
    const { 
        fields: ingredientFields,
        append: appendIngredient,
        remove: removeIngredient, 
    } = useFieldArray({
        control,
        name: "ingredients"
    });

    const handleRemoveIngredients = (index: number, id: string) => {
        removeIngredient(index);
        updateData({ ingredients: currRecipe.ingredients.filter((i) => i.id !== id) });
    }
    const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
        updateData({
            ingredients: currRecipe.ingredients.map((i) =>
                i.id === id ? { ...i, [field]: value } : i
            ),
        });
    };

    const addIngredient = () => {
        const newIng: Ingredient = { 
            id: uuidv4(),
            name: '',
            amount: '',
            unit: Unit.NONE,
        };
        appendIngredient(newIng);
        updateData({ ingredients: [...currRecipe.ingredients, newIng] });
    };

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h5 fw-semibold text-dark m-0">Ingredients List</h3>
                <span className="text-muted small">{currRecipe.ingredients.length} items</span>
            </div>
            {currRecipe.ingredients.length === 0 && (
                <div className="text-center py-5 bg-orange-light border-orange-dashed rounded-3">
                    <p className="text-muted mb-3">No ingredients added yet.</p>
                    <button
                        type="button"
                        onClick={addIngredient}
                        className="btn btn-sunny btn-sm px-3"
                    >
                        Add First Ingredient
                    </button>
                </div>
            )}
            <div className="d-flex flex-column gap-2">
                {ingredientFields.map((ing, index) => (
                    <div
                        key={ing.id}
                        className="d-flex align-items-center gap-2 p-2 bg-white border rounded-3 shadow-sm"
                    >
                        <input {...register(`ingredients.${index}.id`)} hidden value={ing.id} />
                        <div className="text-muted px-2 cursor-move">
                            <GripVertical size={16} />
                        </div>
                        
                        <input
                            {...register(`ingredients.${index}.amount`)}
                            type="text"
                            onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                            placeholder="1/2"
                            className="form-control text-center"
                            style={{ width: '80px' }}
                        />

                        <select
                            {...register(`ingredients.${index}.unit`)}
                            onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                            className="form-select"
                            style={{ width: '110px' }}
                        >
                        <option value="">Unit</option>
                            {Object.values(Unit).map((u) => (
                                <option key={u} value={u}>
                                {u}
                                </option>
                            ))}
                        </select>

                        <input
                            {...register(`ingredients.${index}.name`)}
                            type="text"
                            onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                            placeholder="Ingredient name"
                            className="form-control flex-grow-1"
                        />

                        <button
                            className="btn btn-light text-secondary btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                            type='button'
                            style={{ width: '32px', height: '32px' }}
                            data-bs-toggle="modal" 
                            data-bs-target={`#removeIngredientsModal${index}`} 
                        >
                            <Trash2 size={16} />
                        </button>
                        <div className="modal remove-ingredient-modal fade" id={`removeIngredientsModal${index}`}>
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header border-0">
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body text-center p-0">
                                        <h5>Delete "{ing.name}" from ingredients?</h5>
                                    </div>
                                    <div className="modal-footer border-0">
                                        <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                        <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleRemoveIngredients(index, ing.id)}>Yes</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {currRecipe.ingredients.length > 0 && (
                <button
                    type="button"
                    onClick={addIngredient}
                    className="btn btn-outline-sunny w-100 py-3 rounded-3 d-flex align-items-center justify-content-center gap-2 fw-medium mt-2"
                >
                    <Plus size={16} /> Add Ingredient
                </button>
            )}
            <ErrorMessage
                errors={errors}
                name="ingredients"
                render={() => <p className='error-input create-recipe-error'>Please add at least 1 ingredient</p>}
            />
        </>  
    )
}

export default IngredientsEditor;