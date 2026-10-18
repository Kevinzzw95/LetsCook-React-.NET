import { useState } from 'react';
import { Clock3, Leaf, Trash2, Users, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { recipeCommon } from '../../types/recipe';
import './recipe-card.scss';

type Props = {
    recipe: Partial<recipeCommon>;
    onDelete?: (recipe: Partial<recipeCommon>) => void;
    isDeleting?: boolean;
}

const RecipeCard = ({ recipe, onDelete, isDeleting = false }: Props) => {
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const image = recipe.imageUrls?.[0];
    const title = recipe.title?.trim() || 'Untitled recipe';
    const category = recipe.type || 'Recipe';
    const positiveMinutes = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
    const minutes = positiveMinutes(recipe.readyInMinutes)
        || positiveMinutes(recipe.preparationMinutes) + positiveMinutes(recipe.cookingMinutes);
    const servings = typeof recipe.servings === 'number' && recipe.servings > 0 ? recipe.servings : null;
    const diet = recipe.diet && recipe.diet.toLowerCase() !== 'none' ? recipe.diet : null;
    const detail = diet || recipe.cuisine || 'Home cooking';

    return (
        <div className="col-12 col-md-6 col-xl-4 recipe-card-column">
            <article className="recipe-card">
                <div className="recipe-card__photo">
                    {image && failedImage !== image ? (
                        <img src={image} alt={title} loading="lazy" decoding="async"
                            onError={() => setFailedImage(image)} />
                    ) : (
                        <div className="recipe-card__placeholder" role="img" aria-label="No recipe photo available">
                            <Utensils size={52} strokeWidth={1.4} aria-hidden="true" />
                        </div>
                    )}
                    <span className="recipe-card__category" title={category}>
                        <Utensils size={18} aria-hidden="true" />
                        <span>{category}</span>
                    </span>
                    {onDelete && (
                        <button type="button" className="recipe-card__delete"
                            aria-label={`Delete ${title}`} title={`Delete ${title}`}
                            onClick={() => onDelete(recipe)} disabled={isDeleting}>
                            <Trash2 size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="recipe-card__body">
                    <h3 className="recipe-card__title pb-4" title={title}>
                        {recipe.id ? <Link to={`/recipe-details/${recipe.id}`} className="recipe-card__link">{title}</Link> : title}
                    </h3>
                    <div className="recipe-card__facts">
                        <span className="recipe-card__pill recipe-card__pill--servings">
                            <Users size={18} aria-hidden="true" />
                            {servings ? `${servings} servings` : 'Servings —'}
                        </span>
                        <span className="recipe-card__pill recipe-card__pill--time">
                            <Clock3 size={18} aria-hidden="true" />
                            {minutes ? `${minutes} mins` : 'Time —'}
                        </span>
                        <span className="recipe-card__pill recipe-card__pill--detail" title={detail}>
                            {diet ? <Leaf size={18} aria-hidden="true" /> : <Utensils size={18} aria-hidden="true" />}
                            <span>{detail}</span>
                        </span>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default RecipeCard;
