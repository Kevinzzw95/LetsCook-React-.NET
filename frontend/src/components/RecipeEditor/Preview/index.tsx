import { RecipeDraft } from '../../../types/recipe';
import RecipeDetailsView, { type RecipeDetailsViewRecipe } from '../../RecipeDetailsView';
 
const Preview = (recipe: RecipeDraft) => {
    const previewRecipe: RecipeDetailsViewRecipe = {
        title: recipe.title,
        servings: recipe.servings,
        preparationMinutes: recipe.preparationMinutes ?? recipe.prepTime,
        cuisine: recipe.cuisine,
        type: recipe.type,
        diet: recipe.diet,
        imageUrls: recipe.images ?? [],
        extendedIngredients: recipe.ingredients ?? [],
        instructions: recipe.steps.length
            ? [
                {
                    name: '',
                    steps: recipe.steps.map((step, index) => ({
                        ...step,
                        stepNumber: step.stepNumber ?? index + 1
                    }))
                }
            ]
            : [],
    };
 
    return (
        <>
            {   recipe &&
                <div className='container-fluid d-flex justify-content-center h-100'>
                    <div className='card-glass d-flex flex-column w-100 newrecipe-container p-2 p-md-4'>
                        <RecipeDetailsView recipe={previewRecipe} variant="preview" />
                    </div>
                </div>
            }
        </>
    )
 }
 
 export default Preview; 
