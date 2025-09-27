import { SearchItem } from '../../types/searchItem';
import './recipe-card.scss';
import { Link } from "react-router-dom";

type Props = {
    recipe: SearchItem;
}

const RecipeCard = ({ recipe } : Props) => {
    
    return (
        <div className="col-sm-12 col-md-6 col-lg-4 mb-4 d-flex justify-content-start card recipe-card">
            <Link to={`/recipe-details/${recipe.id}`}>
                <img src={recipe.image} className="card-img-top" alt="..." />
            </Link>
            <label className="card-title pt-2">
                <Link to={`/recipe-details/${recipe.id}`}>
                    { recipe.title }
                </Link>
            </label>
        </div>
    )
}

export default RecipeCard;