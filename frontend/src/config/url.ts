import API_KEY from "./api";

export default { 
    base_url: "https://api.themoviedb.org/3", 
    genre_list_url: "/genre/movie/list?", 
    org_url: "https://image.tmdb.org/t/p/w500",
    //search_url: `https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&`
    search_url: `http://localhost:5000/api/recipe`
};
