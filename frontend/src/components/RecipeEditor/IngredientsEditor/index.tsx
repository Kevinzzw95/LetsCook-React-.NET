import { useEffect, useRef, useState } from 'react';
import './ingredient-editor.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { importedRecipe } from '../../../types/recipe';

type Props = {
    currRecipe: importedRecipe | undefined,
}

const IngredientsEditor = ({currRecipe}: Props) => {
    const { register, resetField, formState: { errors }} = useFormContext();

    const [ ingredients, setIngredients ] = useState<string[]>(currRecipe?.ingredients.map(i => i.original) || []);
    const [ newIngredient, setNewIngredient ] = useState<string>('');
    const [ newValue, setNewValue ] = useState<string>('');
    const newIngredientRef = useRef<HTMLInputElement>(null);
    const handleAddIngredients = () => {
        newIngredientRef.current && newIngredientRef.current.value && setIngredients([...ingredients, newIngredientRef.current.value]);
        setNewIngredient("");
    }
    const handleRemoveIngredients = (taregtIndex: number) => {
        resetField(`ingredients[${taregtIndex}]`, { keepDirty: true })
        setIngredients(ingredients.filter((ingredient, index) => {
            return index !== taregtIndex;
        }));
    }
    const handleEditIngredients = (taregtIndex: number, newValue: string) => {
        setIngredients(ingredients.map((ingredient, index) => {
            if(taregtIndex === index) {
                ingredient = newValue;
            }
            return ingredient;
        }));
    }

    useEffect(() => {
        setIngredients(currRecipe?.ingredients.map(i => i.original) || []);
    }, [currRecipe?.ingredients]);

    return (
        <>
            <div className='d-flex flex-wrap gap-2'>
                {
                    ingredients && ingredients.map((ingredient, index) =>
                        <div className='added-ingredient-item d-flex flex-row align-items-center justify-content-center gap-2 px-2 py-1' key={index}>
                            <input {...register(`ingredients[${index}]`)} hidden value={ingredient} />
                            <span >{ingredient}</span>
                            <FontAwesomeIcon type='button' icon={faXmark} data-bs-toggle="modal" data-bs-target={`#removeIngredientsModal${index}`} />
                            <div className="modal remove-ingredient-modal fade" id={`removeIngredientsModal${index}`}>
                                <div className="modal-dialog">
                                    <div className="modal-content">
                                        <div className="modal-header border-0">
                                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div className="modal-body text-center p-0">
                                            <h5>Delete "{ingredient}" from ingredients?</h5>
                                        </div>
                                        <div className="modal-footer border-0">
                                            <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleRemoveIngredients(index)}>Yes</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <FontAwesomeIcon type='button' icon={faPen} data-bs-toggle="modal" data-bs-target={`#editIngredientsModal${index}`} />
                            <div className="modal edit-ingredient-modal fade" key={index} id={`editIngredientsModal${index}`}>
                                <div className="modal-dialog">
                                    <div className="modal-content">
                                        <div className="modal-header border-0">
                                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div className="modal-body text-center p-0">
                                            <input 
                                                type='text'
                                                className='edit-ingredient-input'
                                                defaultValue={ingredient}
                                                onChange={(e) => setNewValue(e.target.value)}/>
                                        </div>
                                        <div className="modal-footer border-0">
                                            <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleEditIngredients(index, newValue)}>Update</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                <div className="col-md-3">
                    <div className="input-group align-items-center">
                        <input 
                            type="text" 
                            ref={newIngredientRef} 
                            className="form-control ingredient-input" 
                            placeholder="Add a New Ingredient" 
                            aria-label="Add a New Ingredient" 
                            value={newIngredient} 
                            onChange={(e) => setNewIngredient(e.target.value)}
                        />
                        <span className='input-group-prepend add-ingredient-wrapper mx-2'>
                            <button className="btn btn-primary btn-sm btn-add-ingredient" 
                                type="button" 
                                onClick={handleAddIngredients}>
                                Add
                            </button>   
                        </span>
                    </div>
                </div>
            </div>
            <ErrorMessage
                errors={errors}
                name="ingredients"
                render={() => <p className='error-input create-recipe-error'>Please add at least 1 ingredient</p>}
            />
        </>  
    )
}

export default IngredientsEditor;