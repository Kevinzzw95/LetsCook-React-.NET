import { useNavigate, useParams } from 'react-router-dom';
import { useAddItemsToShoppingListMutation, useDeleteRecipeMutation, useGetRecipeQuery } from '../../redux/recipe/recipeApiSlice';
import { Ingredient } from '../../types/ingredient';
import RecipeDetailsView from '../../components/RecipeDetailsView';

const RecipeDetails = () => {
    const navigate = useNavigate();

    const {id} = useParams<{id: string}>();
    const recipeId = Number(id);
    const { data: recipe, isLoading } = useGetRecipeQuery(recipeId);

	const [
        addItemsToShoppingList,
    ] = useAddItemsToShoppingListMutation();
    const [deleteRecipe, { isLoading: isDeletingRecipe }] = useDeleteRecipeMutation();

    const handleAddItemToShoppingList = (ingredient: Ingredient) => {
        addItemsToShoppingList({
            IngredientId: ingredient.id,
            Amount: ingredient.amount,
            unit: ingredient.unit
        })
    };

    const handleDeleteRecipe = async () => {
        if (!recipe || !window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) {
            return;
        }

        await deleteRecipe(recipeId).unwrap();
        navigate('/recipe-list/');
    };

    if(isLoading) return <h3>Loading...</h3>

    if(!recipe) return <h3>Recipe not found</h3>

    return (
        <>
            {   recipe &&
                <div className='container-fluid d-flex justify-content-center h-100'>
                    <div className='card-glass d-flex flex-column w-100 newrecipe-container p-2 p-md-4'>
                        <RecipeDetailsView
                            recipe={recipe}
                            variant="page"
                            editRecipeHref={`/edit-recipe/${recipe.id}`}
                            onAddItemToShoppingList={handleAddItemToShoppingList}
                            onDeleteRecipe={handleDeleteRecipe}
                            isDeletingRecipe={isDeletingRecipe}
                        />
                    </div>
                </div>
            }
        </>
    )
}

export default RecipeDetails; 
