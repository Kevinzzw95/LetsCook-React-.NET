import { createBrowserRouter } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import EditRecipe from "../pages/EditRecipe";
import RecipeList from "../pages/RecipeList";
import RecipeDetails from "../pages/RecipeDetails";
import Login from "../pages/Login";
import Registration from "../pages/Registration";
import App from "../App";
import ShoppingList from "../pages/ShoppingList";
import MealPlans from "../pages/MealPlans";
import Profile from "../pages/Profile";
import Chatbot from "../pages/Chatbot";

export const router = createBrowserRouter([
   { 
        path: "/",
        element: <App />,
        children: [
            {
                element: <RequireAuth />,
                children: [
                    { path: '/new-recipe/', element: <EditRecipe />},
                    { path: '/edit-recipe/:id', element: <EditRecipe />},
                    { path: '/recipe-list/', element: <RecipeList />},
                    { path: '/shopping-list/', element: <ShoppingList />},
                    { path: '/meal-plans/', element: <MealPlans />},
                    { path: '/chatbot/', element: <Chatbot />},
                    { path: '/profile/', element: <Profile />},
                    { path: '/recipe-details/:id', element: <RecipeDetails />},
                    { path: '/new-recipe/', element: <EditRecipe />}
                ],
            },
            { path: '/login/', element: <Login />},
            { path: '/registration/', element: <Registration />},
        ]
    }
]);
