import Filter from '../../components/Filter';
import RecipeCard from '../../components/RecipeCard';
import { useState } from "react";
import './recipe-list.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';
import { useGetRecipesQuery } from '../../redux/recipe/recipeApiSlice';

const RecipeList = () => {

    const [isOpenMobileFilter, setIsOpenMobileFilter] = useState<boolean>(false); 
    const { data: recipes = [] } = useGetRecipesQuery();
    const recipeList = recipes.map((recipe: any) => ({
        ...recipe,
        images: recipe.imageUrls ?? recipe.images ?? [],
        cuisines: recipe.cuisine ?? recipe.cuisines ?? '',
        dishTypes: recipe.dishType ?? recipe.dishTypes ?? ''
    }));

    const openFilter = () => {
        setIsOpenMobileFilter(val => !val);
    }

    const props = { isOpenMobileFilter, openFilter };

    return (
        <>
            <div className="container-fluid py-4">
                {/* Header & Search */}
                <div className="row mb-4 align-items-center">
                    <div className="col-md-6 mb-3 mb-md-0">
                        <h1 className="h2 fw-bold text-dark m-0">Explore Recipes</h1>
                        <p className="text-secondary m-0">Find your next favorite meal</p>
                    </div>
                    <div className='search-result-header col-md-6 d-flex justify-content-md-end justify-content-between py-3'>
                        <FontAwesomeIcon className='recipe-filter d-md-none' icon={faFilter} onClick={openFilter}/>
                        <span className="search-result-count">
                            142 Results
                        </span>
                    </div>
                </div>
                <div className="row g-4">
                    <div className='col-lg-3'>
                        <Filter {...props}/>
                    </div>
                    <div className="col-md-7 col-lg-9">
                        <div className='row g-4'>
                            {
                                recipeList.map((recipe, index) => 
                                    <RecipeCard recipe={ recipe } key={index}/>
                                )
                            }
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default RecipeList;
