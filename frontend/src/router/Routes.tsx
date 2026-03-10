import { createBrowserRouter } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import EditRecipe from "../pages/EditRecipe";
import RecipeList from "../pages/RecipeList";
import RecipeDetails from "../pages/RecipeDetails";
import Login from "../pages/Login";
import Registration from "../pages/Registration";
import App from "../App";
import ShoppingList from "../pages/ShoppingList";

export const router = createBrowserRouter([
   { 
        path: "/",
        element: <App />,
        children: [
            {
                element: <RequireAuth />,
                children: [
                    { path: '/new-recipe/', element: <EditRecipe />},
                    { path: '/recipe-list/', element: <RecipeList />},
                    { path: '/shopping-list/', element: <ShoppingList />}
                ],
            },
            //{ path: '/recipe-list/', element: <RecipeList />},
            { path: '/recipe-details/:id', element: <RecipeDetails />},
            { path: '/login/', element: <Login />},
            { path: '/registration/', element: <Registration />},
            { path: '/new-recipe/', element: <EditRecipe />},
        ]
    }
]);