import { MAIN_API_BASE_URL } from "./environment";

export default { 
    base_url: "https://api.themoviedb.org/3", 
    genre_list_url: "/genre/movie/list?", 
    org_url: "https://image.tmdb.org/t/p/w500",
    //search_url: `https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&`
    search_url: `${MAIN_API_BASE_URL}recipe`
};
