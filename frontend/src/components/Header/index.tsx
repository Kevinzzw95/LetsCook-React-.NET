import './header.scss';
import { Link } from "react-router-dom";
import AddRecipeOptions from "../AddRecipeOptions";
import { BookOpen, Bot, CalendarDays, PlusCircle, ShoppingCart, User } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentToken, selectCurrentUser } from "../../redux/auth/authSlice";

const navigationItems = [
    { to: '/recipe-list', label: 'Recipes', icon: BookOpen },
    { to: '/meal-plans/', label: 'Meal Plans', icon: CalendarDays },
    { to: '/shopping-list/', label: 'Shopping List', icon: ShoppingCart },
    { to: '/chatbot/', label: 'AI Chef', icon: Bot }
];

const Header = () => {
    const token = useSelector(selectCurrentToken);
    const currentUser = useSelector(selectCurrentUser);

    return (
        <header id="header" className="header sticky-top">
            <div className="header-container position-relative d-flex align-items-center justify-content-between gap-2">
                <Link to="/" className="logo d-flex align-items-center me-xl-0 text-decoration-none">
                    <h1 className="sitename">Yummy</h1>
                </Link>

                {navigationItems.map(({ to, label, icon: Icon }) => (
                    <Link
                        key={to}
                        className="btn btn-link text-decoration-none text-dark fw-medium d-flex align-items-center gap-2 px-2 hover-scale order-2"
                        to={to}
                    >
                        <Icon size={20} className="text-secondary" />
                        <span className="d-none d-md-inline">{label}</span>
                    </Link>
                ))}

                <div className="dropdown-center dropdown d-flex order-2 btn-header">
                    <button className="btn btn-secondary dropdown-toggle btn-newrecipe text-dark fw-medium d-flex align-items-center gap-2 px-2 hover-scale" type="button" data-bs-toggle="dropdown" data-bs-offset="-30,10" aria-expanded="false">
                        <div className="d-flex align-items-center justify-content-center bg-orange-light text-orange rounded-circle p-2">
                            <PlusCircle size={20} />
                        </div>
                        <div className="add-recipe-label d-none d-md-block">Create</div>
                    </button>
                    <AddRecipeOptions />
                </div>

                {token && currentUser ? (
                    <Link
                        className="btn btn-link text-decoration-none text-dark fw-medium d-flex align-items-center gap-2 px-2 hover-scale order-2"
                        to={"/profile/"}
                    >
                        <User size={20} className="text-secondary" />
                        <span className="d-none d-md-inline">{`Hi, ${currentUser}`}</span>
                    </Link>
                ) : (
                    <Link className="order-2 icon-circle bg-warning text-white rounded-circle" to={"/login"}>
                        <User size={20} />
                    </Link>
                )}
            </div>
        </header>
    )
}

export default Header;
