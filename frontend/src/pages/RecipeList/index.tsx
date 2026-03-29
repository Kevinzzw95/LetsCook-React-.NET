import Filter from '../../components/Filter';
import RecipeCard from '../../components/RecipeCard';
import { useEffect, useState } from "react";
import type { FormEvent } from 'react';
import './recipe-list.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';
import { Search, X } from 'lucide-react';
import { useDeleteRecipeMutation, useGetRecipeFacetsQuery, useSearchRecipesQuery } from '../../redux/recipe/recipeApiSlice';
import { useSearchParams } from 'react-router-dom';
import { RefinementCounts } from '../../types/refinements';
import type { recipeCommon } from '../../types/recipe';

const RecipeList = () => {
    const [isOpenMobileFilter, setIsOpenMobileFilter] = useState<boolean>(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const pageParam = Number(searchParams.get('page') ?? '1');
    const pageNumber = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const query = searchParams.get('query') ?? '';
    const type = searchParams.get('type') ?? undefined;
    const cuisine = searchParams.get('cuisine') ?? undefined;
    const diet = searchParams.get('diet') ?? undefined;
    const [searchInput, setSearchInput] = useState(query);
    const [deletingRecipeId, setDeletingRecipeId] = useState<number | null>(null);
    const [deleteRecipe] = useDeleteRecipeMutation();

    useEffect(() => {
        setSearchInput(query);
    }, [query]);

    const { data: searchData } = useSearchRecipesQuery({
        pageNumber,
        pageSize: 12,
        query: query || undefined,
        type,
        cuisine,
        diet
    });
    const { data: facetData } = useGetRecipeFacetsQuery({
        query: query || undefined,
        type,
        cuisine,
        diet
    });

    const recipeList = (searchData?.items ?? []).map((recipe: recipeCommon) => ({
        ...recipe,
        images: recipe.imageUrls ?? recipe.images ?? []
    }));
    const totalPages = searchData?.totalPages ?? 1;
    const totalCount = searchData?.totalCount ?? 0;
    const counts: RefinementCounts = {
        type: facetData?.type ?? {},
        cuisine: facetData?.cuisine ?? {},
        diet: facetData?.diet ?? {}
    };

    const openFilter = () => {
        setIsOpenMobileFilter(val => !val);
    }

    const changePage = (nextPage: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', nextPage.toString());
        setSearchParams(params);
    };

    useEffect(() => {
        if (totalPages > 0 && pageNumber > totalPages) {
            const params = new URLSearchParams(searchParams);
            params.set('page', totalPages.toString());
            setSearchParams(params);
        }
    }, [pageNumber, searchParams, setSearchParams, totalPages]);

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextParams = new URLSearchParams(searchParams);
        const trimmedQuery = searchInput.trim();

        if (trimmedQuery) {
            nextParams.set('query', trimmedQuery);
        } else {
            nextParams.delete('query');
        }

        nextParams.set('page', '1');
        setSearchParams(nextParams);
    };

    const clearSearch = () => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('query');
        nextParams.set('page', '1');
        setSearchInput('');
        setSearchParams(nextParams);
    };

    const handleDeleteRecipe = async (recipe: Partial<recipeCommon>) => {
        if (!recipe.id || !window.confirm(`Delete "${recipe.title ?? 'this recipe'}"? This cannot be undone.`)) {
            return;
        }

        setDeletingRecipeId(Number(recipe.id));
        try {
            await deleteRecipe(Number(recipe.id)).unwrap();
        } finally {
            setDeletingRecipeId(null);
        }
    };

    const props = {
        isOpenMobileFilter,
        openFilter,
        resultCount: totalCount,
        counts
    };

    return (
        <>
            <div className="container-fluid py-4">
                <div className="recipe-list-hero row g-4 align-items-end mb-4">
                    <div className="col-lg-5">
                        <div className="recipe-list-copy">
                            <span className="recipe-list-kicker">Recipe Search</span>
                            <h1 className="h2 fw-bold text-dark mb-2">Explore Recipes</h1>
                            <p className="text-secondary m-0">
                                Search your recipe collection by title or ingredient, then narrow it down with filters.
                            </p>
                        </div>
                    </div>
                    <div className="col-lg-7">
                        <form className="recipe-search-form" onSubmit={handleSearchSubmit}>
                            <label className="visually-hidden" htmlFor="recipe-search-input">
                                Search recipes by title or ingredient
                            </label>
                            <div className="recipe-search-shell">
                                <Search size={18} className="recipe-search-icon" />
                                <input
                                    id="recipe-search-input"
                                    type="search"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    placeholder="Search by recipe title or ingredient name"
                                    className="recipe-search-input"
                                />
                                {searchInput && (
                                    <button
                                        type="button"
                                        className="recipe-search-clear"
                                        onClick={clearSearch}
                                        aria-label="Clear recipe search"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                <button type="submit" className="btn btn-sunny recipe-search-submit">
                                    Search
                                </button>
                            </div>
                            <div className="recipe-search-actions">
                                <div className='search-result-header d-flex justify-content-md-end justify-content-between align-items-center'>
                                    <FontAwesomeIcon className='recipe-filter d-md-none' icon={faFilter} onClick={openFilter}/>
                                    <span className="search-result-count">
                                        {totalCount} Results
                                    </span>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="row g-4">
                    <div className='col-lg-3'>
                        <Filter {...props}/>
                    </div>
                    <div className="col-md-7 col-lg-9">
                        {recipeList.length > 0 ? (
                            <div className='row g-4'>
                                {
                                    recipeList.map((recipe, index) =>
                                        <RecipeCard
                                            recipe={recipe}
                                            key={index}
                                            onDelete={handleDeleteRecipe}
                                            isDeleting={deletingRecipeId === Number(recipe.id)}
                                        />
                                    )
                                }
                            </div>
                        ) : (
                            <div className="recipe-empty-state card-glass text-center py-5 px-4">
                                <h2 className="h4 fw-bold text-dark mb-2">No recipes found</h2>
                                <p className="text-secondary mb-0">
                                    {query
                                        ? `No recipes matched "${query}". Try another title or ingredient keyword.`
                                        : 'No recipes available yet. Add a recipe to start building your collection.'}
                                </p>
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="recipe-pagination d-flex justify-content-center align-items-center gap-2 mt-4">
                                <button
                                    className="btn btn-outline-secondary rounded-pill px-3"
                                    disabled={pageNumber <= 1}
                                    onClick={() => changePage(pageNumber - 1)}
                                >
                                    Previous
                                </button>
                                <span className="recipe-pagination-label">
                                    Page {pageNumber} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-outline-sunny rounded-pill px-3"
                                    disabled={pageNumber >= totalPages}
                                    onClick={() => changePage(pageNumber + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default RecipeList;
