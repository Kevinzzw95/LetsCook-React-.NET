import { Clock, Flame, Star, Users } from 'lucide-react';
import { recipeCommon } from '../../types/recipe';
import { SearchItem } from '../../types/searchItem';
import './recipe-card.scss';
import { Link } from "react-router-dom";

type Props = {
    recipe: Partial<recipeCommon>;
}

const RecipeCard = ({ recipe } : Props) => {
    
    return (
        <div key={recipe.id} className="col-md-6 col-xl-4 animate-fade-in">
            <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-scale">
                <div className="position-relative" style={{ height: '200px' }}>
                <img 
                    src={recipe.images && recipe.images[0]} 
                    alt={recipe.title} 
                    className="w-100 h-100 object-fit-cover"
                />
                {/* <button className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3 p-2 shadow-sm text-secondary hover-text-danger transition-all">
                    <Heart size={18} />
                </button> */}
                <div className="position-absolute bottom-0 start-0 m-3">
                    <span className="badge bg-white text-dark shadow-sm px-2 py-1 rounded-pill fw-bold" style={{ fontSize: '0.75rem' }}>
                        {recipe.cuisines}
                    </span>
                </div>
                </div>
                
                <div className="card-body p-4 d-flex flex-column">
                {/* <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="h5 fw-bold text-dark mb-0 line-clamp-2">{recipe.title}</h3>
                    <div className="d-flex align-items-center gap-1 text-warning small fw-bold">
                    <Star size={14} fill="currentColor" /> {recipe.rating}
                    </div>
                </div> 
                
                    <p className="text-secondary small mb-3 flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {recipe.description}
                    </p>*/}

                    <div className="d-flex align-items-center gap-3 text-secondary small mb-3">
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

                    <div className="d-flex gap-1 flex-wrap mb-3">
                        {recipe.diets?.map(d => d !== 'None' && (
                            <span key={d} className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 fw-normal">
                                {d}
                            </span>
                        ))}
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 fw-normal">
                            {recipe.dishTypes}
                        </span>
                    </div>

                    <Link to={`/recipe-details/${recipe.id}`}
                        type='button'
                        className="btn btn-outline-sunny w-100 rounded-pill fw-medium mt-auto"
                    >
                        View Recipe
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default RecipeCard;