import { Clock, Trash2, Users } from 'lucide-react';
import { recipeCommon } from '../../types/recipe';
import './recipe-card.scss';
import { useNavigate } from "react-router-dom";

type Props = {
    recipe: Partial<recipeCommon>;
    onDelete?: (recipe: Partial<recipeCommon>) => void;
    isDeleting?: boolean;
}

const RecipeCard = ({ recipe, onDelete, isDeleting = false } : Props) => {
    const navigate = useNavigate();

    const goToRecipeDetails = () => {
        if (!recipe.id) return;
        navigate(`/recipe-details/${recipe.id}`);
    };

    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            goToRecipeDetails();
        }
    };
    
    return (
        <div key={recipe.id} className="col-md-4 col-xl-3 animate-fade-in">
            <div
                className="card recipe-card-clickable h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-scale"
                onClick={goToRecipeDetails}
                onKeyDown={handleCardKeyDown}
                role="link"
                tabIndex={0}
                aria-label={`View details for ${recipe.title ?? 'recipe'}`}
            >
                <div className="position-relative" style={{ height: '250px' }}>
                <img 
                    src={recipe.imageUrls && recipe.imageUrls[0]} 
                    alt={recipe.title} 
                    className="w-100 h-100 object-fit-cover"
                />
                {/* <button className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 p-2 shadow-sm text-secondary hover-text-danger transition-all">
                    <Heart size={18} />
                </button> */}
                <div className="position-absolute bottom-0 start-0 m-3">
                    <span className="badge bg-white text-dark shadow-sm px-2 py-1 rounded-pill fw-bold" style={{ fontSize: '0.75rem' }}>
                        {recipe.cuisine}
                    </span>
                </div>
                </div>
                
                <div className="card-body p-4 d-flex flex-column">
                    {onDelete && (
                        <div className="d-flex justify-content-between mb-3">
                            <div>{recipe.title}</div>
                            <button
                                type="button"
                                className="recipe-card-delete btn btn-light border-0 rounded-pill d-inline-flex align-items-center gap-2"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onDelete(recipe);
                                }}
                                disabled={isDeleting} 
                            >
                                <Trash2 size={14} />

                            </button>
                        </div>
                    )}
                {/* <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="h5 fw-bold text-dark mb-0 line-clamp-2">{recipe.title}</h3>
                    <div className="d-flex align-items-center gap-1 text-warning small fw-bold">
                    <Star size={14} fill="currentColor" /> {recipe.rating}
                    </div>
                </div> 
                
                    <p className="text-secondary small mb-3 flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {recipe.description}
                    </p>*/}

                    <div className="d-flex align-items-center gap-3 text-secondary small mb-2">
                        <div className="d-flex align-items-center gap-1">
                            <Clock size={14} /> {recipe.preparationMinutes}
                        </div>
                        {/* <div className="d-flex align-items-center gap-1">
                        <Flame size={14} /> {recipe.nutrition.calories} kcal
                        </div> */}
                        <div className="d-flex align-items-center gap-1">
                            <Users size={14} /> {recipe.servings}
                        </div>
                    </div>

                    <div className="d-flex gap-1 flex-wrap">
                        {recipe.diet && recipe.diet !== 'None' && (
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 fw-normal">
                                {recipe.diet}
                            </span>
                        )}
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 fw-normal">
                            {recipe.type}
                        </span>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default RecipeCard;
