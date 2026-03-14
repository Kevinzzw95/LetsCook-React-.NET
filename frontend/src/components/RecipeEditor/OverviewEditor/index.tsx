import './overview-editor.scss'
import { CATEGORIES } from '../../../constants';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { ErrorMessage } from "@hookform/error-message";
import { RecipeDraft } from '../../../types/recipe';

type Props = {
    currRecipe: RecipeDraft | undefined;
    updateData: (updates: Partial<RecipeDraft>) => void;
}

const OverviewEditor = ({currRecipe}: Props) => {
    const { register, setValue, formState: { errors }} = useFormContext();

    useEffect(() => {
        setValue("title", currRecipe?.title);
        setValue("servings", currRecipe?.servings);
        setValue("preparationMinutes", currRecipe?.preparationMinutes ?? 0);
    }, [currRecipe?.title, currRecipe?.servings, currRecipe?.preparationMinutes, setValue]);

    useEffect(() => {
        setValue("servings", 1);
        setValue("preparationMinutes", 0);
    }, [setValue]);

    return (
        <>
            <div className="">
                <label htmlFor="recipeTitle" className="newrecipe-form-label py-2">Title</label>
                <input {...register("title")} 
                    type="text" 
                    className="form-control" 
                    id="recipeTitle" 
                    aria-describedby="recipeTitle"
                    onChange={(e) => setValue("title", e.target.value)} />
                <ErrorMessage
                    errors={errors}
                    name="title"
                    render={({ message }) => <p className='error-input create-recipe-error'>{message}</p>}
                />
            </div>
            <div className='row'>
                {
                    CATEGORIES && CATEGORIES.map((category) => 
                        <div className='col-12 col-md-4' key={category.name}>
                            <label htmlFor={category.name} className="newrecipe-form-label py-2">{ category.name }(Optional)</label>
                            <select {...register(category.name)} id={category.name} className="form-select" defaultValue={"None"} aria-label="Default select example">
                                <option value="None" disabled>Choose one {category.name}</option>
                                {
                                    category.values.length && category.values.map((value) => 
                                        <option key={value}>{ value }</option>
                                    )
                                }
                                <option value="Customize">Customize</option>
                            </select>
                        </div>
                    )
                }

                {/* <div className="col-12 col-md-6">
                    <label htmlFor="recipeResource" className="newrecipe-form-label py-2">Resource(Optional)</label>
                    <input {...register("sourceUrl")} type="text" className="form-control" id="recipeResource" aria-describedby="recipeResource" />
                </div> */}
                <div className="col-12 col-md-4">
                    <label htmlFor="recipeServings" className="newrecipe-form-label py-2">Servings</label>
                    <input 
                        {...register("servings")}
                        type="number" 
                        min={0} 
                        className="form-control" 
                        id="recipeServings" 
                        aria-describedby="recipeServings" 
                        onChange={(e) => setValue("servings", Number(e.target.value))} />
                </div>
                <div className="col-12 col-md-4">
                    <label htmlFor="recipePreparationMinutes" className="newrecipe-form-label py-2">Preparation Minutes</label>
                    <input
                        {...register("preparationMinutes")}
                        type="number"
                        min={0}
                        className="form-control"
                        id="recipePreparationMinutes"
                        aria-describedby="recipePreparationMinutes"
                        onChange={(e) => setValue("preparationMinutes", Number(e.target.value))}
                    />
                </div>
            </div>
        </>
    )
}

export default OverviewEditor;
