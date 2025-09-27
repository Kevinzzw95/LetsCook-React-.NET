import Filter from '../../components/Filter';
import RecipeCard from '../../components/RecipeCard';
import { useEffect, useState } from "react";
import './recipe-list.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';
import { SearchItem } from '../../types/searchItem';
import axios from 'axios';
import { recipeSearchRes } from '../../types/recipe';
import url from '../../config/url';
import agent from '../../redux/api/agent';

const RecipeList = () => {

    const location = useLocation();
    const [isOpenMobileFilter, setIsOpenMobileFilter] = useState<boolean>(false); 
    const [recipeList, setRecipeList] = useState<SearchItem[]>([]);

    /* useEffect(() => {
        axios.get<recipeSearchRes>(url.search_url + location.search.split('?')[1])
            .then(
                res => {
                    setRecipeList(res.data.results)
                },
                err => console.log(err)
            )
    }, [location]); */

    useEffect(() => {
        agent.Recipe.list()
            .then(
                recipes => {
                    setRecipeList(recipes)
                },
                err => console.log(err)
            )
    }, []);

    const openFilter = () => {
        setIsOpenMobileFilter(val => !val);
    }

    const props = { isOpenMobileFilter, openFilter };

    return (
        <>
            <div className="container ">
                <div className="row">
                    <div className='search-result-header d-flex justify-content-md-end justify-content-between py-3'>
                        <FontAwesomeIcon className='recipe-filter d-md-none' icon={faFilter} onClick={openFilter}/>
                        <span className="search-result-count">
                            142 Results
                        </span>
                    </div>
                    <Filter {...props}/>
                    <div className="col-md-7 col-lg-9">
                        <div className='row'>
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