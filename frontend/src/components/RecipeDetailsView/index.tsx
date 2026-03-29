import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Users, Utensils } from 'lucide-react';
import type { Ingredient } from '../../types/ingredient';
import type { instruction } from '../../types/instruction';
import '../../pages/RecipeDetails/recipe-details.scss';

interface RecipeDetailsViewRecipe {
    id?: string | number;
    title: string;
    imageUrls?: (File | string)[];
    servings?: number;
    preparationMinutes?: number;
    cuisine?: string;
    type?: string;
    diet?: string;
    instructions: instruction[];
    extendedIngredients: Ingredient[];
    calories?: number;
    protein?: number;
    carbohydrate?: number;
    fat?: number;
}

interface Props {
    recipe: RecipeDetailsViewRecipe;
    variant?: 'page' | 'preview';
    editRecipeHref?: string;
    onAddItemToShoppingList?: (ingredient: Ingredient) => void;
    onDeleteRecipe?: () => void;
    isDeletingRecipe?: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const RecipeDetailsView = ({
    recipe,
    variant = 'page',
    editRecipeHref,
    onAddItemToShoppingList,
    onDeleteRecipe,
    isDeletingRecipe = false
}: Props) => {
    const imageSources = useMemo(
        () =>
            (recipe.imageUrls ?? []).map((image) => ({
                src: typeof image === 'string' ? image : URL.createObjectURL(image),
                revoke: typeof image !== 'string'
            })),
        [recipe.imageUrls]
    );

    useEffect(() => {
        return () => {
            imageSources.forEach((image) => {
                if (image.revoke) {
                    URL.revokeObjectURL(image.src);
                }
            });
        };
    }, [imageSources]);

    const [currentImage, setCurrentImage] = useState<string>(imageSources[0]?.src ?? '');

    useEffect(() => {
        setCurrentImage(imageSources[0]?.src ?? '');
    }, [imageSources]);

    const ingredientNames = useMemo(
        () =>
            Array.from(
                new Set(
                    recipe.extendedIngredients
                        .map((ingredient) => ingredient.name?.trim())
                        .filter((name): name is string => Boolean(name))
                )
            ),
        [recipe.extendedIngredients]
    );

    const getHighlightedText = (text: string) => {
        if (!ingredientNames.length) return <span>{text}</span>;

        const pattern = ingredientNames.map(escapeRegExp).join('|');
        if (!pattern) return <span>{text}</span>;

        const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
        return (
            <span>
                {parts.map((part, index) => {
                    const isIngredient = ingredientNames.some(
                        (ingredient) => ingredient.toLowerCase() === part.toLowerCase()
                    );
                    return isIngredient ? (
                        <span key={`${part}-${index}`} className='step-keywords'>
                            {part}
                        </span>
                    ) : (
                        <span key={`${part}-${index}`}>{part}</span>
                    );
                })}
            </span>
        );
    };

    return (
        <>
            <div className="row g-4 mb-5">
                <div className="col-lg-6">
                    <div className="position-relative rounded-4 overflow-hidden shadow-sm" style={{ aspectRatio: '4/3' }}>
                        {imageSources.length > 0 ? (
                            <>
                                <img src={currentImage} alt={recipe.title} className="w-100 h-100 object-fit-cover" />
                                <div
                                    className="position-absolute bottom-0 justify-content-end start-0 w-100 p-3 bg-gradient-dark text-white d-flex gap-2 overflow-auto"
                                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
                                >
                                    {imageSources.map((image, index) => (
                                        <button
                                            key={`${image.src}-${index}`}
                                            type="button"
                                            className="rounded-2 overflow-hidden border border-white p-0 bg-transparent"
                                            style={{ width: '60px', height: '60px', flexShrink: 0 }}
                                            onClick={() => setCurrentImage(image.src)}
                                        >
                                            <img src={image.src} className="w-100 h-100 object-fit-cover" alt={`Thumbnail ${index + 1}`} />
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="w-100 h-100 bg-secondary-subtle d-flex align-items-center justify-content-center">
                                <Utensils size={64} className="text-secondary opacity-25" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-lg-6 d-flex flex-column justify-content-center">
                    <div className="d-flex flex-wrap gap-2 mb-2">
                        <span className="badge bg-orange-light text-orange border-orange-dashed rounded-pill px-3 py-1 fw-bold">
                            {recipe.cuisine || 'Global Cuisine'}
                        </span>
                        {recipe.type && (
                            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-3 py-1 fw-bold">
                                {recipe.type}
                            </span>
                        )}
                        {recipe.diet && recipe.diet !== 'None' && (
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fw-bold">
                                {recipe.diet}
                            </span>
                        )}
                    </div>
                    <h1 className="display-5 fw-bold text-dark mb-3">{recipe.title || 'Untitled Recipe'}</h1>
                    {variant === 'page' && (
                        <div className="mb-3 d-flex flex-wrap gap-2">
                            {editRecipeHref && (
                                <Link to={editRecipeHref} className="btn btn-outline-sunny rounded-pill fw-medium">
                                    Edit Recipe
                                </Link>
                            )}
                            {onDeleteRecipe && (
                                <button
                                    type="button"
                                    className="btn btn-outline-danger rounded-pill fw-medium"
                                    onClick={onDeleteRecipe}
                                    disabled={isDeletingRecipe}
                                >
                                    {isDeletingRecipe ? 'Deleting...' : 'Delete Recipe'}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="d-flex flex-wrap gap-4 pt-3 border-top">
                        <div className="d-flex align-items-center gap-2">
                            <div className="icon-circle bg-light text-warning">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="m-0 text-muted small fw-bold text-uppercase">Prep Time</p>
                                <p className="m-0 fw-semibold">{recipe.preparationMinutes ?? '--'}</p>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <div className="icon-circle bg-light text-primary">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="m-0 text-muted small fw-bold text-uppercase">Servings</p>
                                <p className="m-0 fw-semibold">{recipe.servings ?? '--'} ppl</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-5">
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Calories(kcal)</p>
                        <h3 className="h4 fw-bold text-dark m-0">{recipe.calories ?? '--'}</h3>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Protein(g)</p>
                        <h3 className="h4 fw-bold text-primary m-0">{recipe.protein ?? '--'}</h3>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Carbs(g)</p>
                        <h3 className="h4 fw-bold text-warning m-0">{recipe.carbohydrate ?? '--'}</h3>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Fat(g)</p>
                        <h3 className="h4 fw-bold text-danger m-0">{recipe.fat ?? '--'}</h3>
                    </div>
                </div>
            </div>

            <div className='recipe-details row py-2'>
                <div className='col-md-5'>
                    <div className='details-header justify-content-between'>
                        <h2>Ingredients</h2>
                        <span className='d-flex justify-content-between'>
                            <span className='px-4'>Servings: {recipe.servings ?? '--'}</span>
                        </span>
                    </div>
                    <div className='details-content d-md-flex justify-content-md-between w-100'>
                        <div className='col-12'>
                            <ul className='px-0'>
                                {recipe.extendedIngredients.map((ingredient, index) => (
                                    <li className='ingredient-item d-flex justify-content-between align-items-center gap-2' key={`${ingredient.name}-${index}`}>
                                        <span className='ingredient-name'>{ingredient.name}</span>
                                        <span>{ingredient.amount} {String(ingredient.unit ?? '').toUpperCase()}</span>
                                        {variant === 'page' && onAddItemToShoppingList && (
                                            <button
                                                type="button"
                                                onClick={() => onAddItemToShoppingList(ingredient)}
                                                className='btn btn-sm border-0 rounded-pill px-3 d-flex align-items-center gap-2 fw-medium shadow-sm btn-sunny'
                                            >
                                                <Plus size={16} />
                                                Shopping List
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className='col-md-7'>
                    <div className='details-header justify-content-between'>
                        <h2>Steps</h2>
                    </div>
                    <div className='details-content'>
                        {recipe.instructions.map((section, index) => (
                            <div key={`${section.name || 'section'}-${index}`}>
                                {section.name && <div className='instruction-header'>{section.name}</div>}
                                <div className='instruction-container'>
                                    {section.steps.map((step) => (
                                        <div className='step-container' key={step.stepNumber}>
                                            <span className='step-header'>Step {step.stepNumber}</span>
                                            <div className='step-text'>{getHighlightedText(step.description)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export type { RecipeDetailsViewRecipe };
export default RecipeDetailsView;
