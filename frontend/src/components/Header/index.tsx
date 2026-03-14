import { faBars, faPlus, faSearch, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import './header.scss';
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import classnames from 'classnames';
import { faUser } from "@fortawesome/free-regular-svg-icons";
import { Link } from "react-router-dom";
import AddRecipeOptions from "../AddRecipeOptions";
import { BookOpen, CalendarDays, PlusCircle, ShoppingCart, User } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentToken, selectCurrentUser } from "../../redux/auth/authSlice";

const Header = () => {
    const token = useSelector(selectCurrentToken);
    const currentUser = useSelector(selectCurrentUser);

    const [isOpenMobileNav, setIsToggleMobileNav] = useState<boolean>(false);
    const [activeDropdowns, setActiveDropdowns] = useState<number[]>([]);

    useEffect(() => {
        document.body.classList.toggle('mobile-nav-active');
    }, [isOpenMobileNav]);

    const mobileNavToggle = () => {
        setIsToggleMobileNav(!isOpenMobileNav);
    }

    const mobileDropdownToggle = (index: number) => {
        setActiveDropdowns((prev) => {
            if (prev.includes(index)) {
                return prev.filter((i) => i !== index); // Remove index if already active
            } else {
                return [...prev, index]; // Add index if not active
            }
        });
    };

    return (
        <header id="header" className="header sticky-top">
            <div className="header-container position-relative d-flex align-items-center justify-content-between gap-2">

                {/* <nav id="navmenu" className="navmenu d-xl-none">
                    <ul>
                        <li>
                            <a href="#hero" className="active">Home<br />
                            </a>
                        </li>
                        <li className={classnames("dropdown", activeDropdowns.includes(1) ? "active" : "")} key={1}>
                            <a href="#">
                                <span>Recipes</span> 
                                <FontAwesomeIcon className="px-2" icon={faCaretDown} onClick={() => mobileDropdownToggle(1)} />
                            </a>
                            <ul className={activeDropdowns.includes(1) ? "dropdown-active" : ""}>
                                <li><a href="#">Dropdown 1</a></li>
                                <li className={classnames("dropdown", activeDropdowns.includes(2) ? "active" : "")} key={2}>
                                    <a href="#">
                                        <span>Deep Dropdown</span> 
                                        <FontAwesomeIcon icon={faCaretDown} onClick={() => mobileDropdownToggle(2)} />
                                    </a>
                                    <ul className={activeDropdowns.includes(2) ? "dropdown-active" : ""}>
                                        <li><a href="#">Deep Dropdown 1</a></li>
                                        <li><a href="#">Deep Dropdown 2</a></li>
                                        <li><a href="#">Deep Dropdown 3</a></li>
                                        <li><a href="#">Deep Dropdown 4</a></li>
                                        <li><a href="#">Deep Dropdown 5</a></li>
                                    </ul>
                                </li>
                                <li><a href="#">Dropdown 2</a></li>
                                <li><a href="#">Dropdown 3</a></li>
                                <li><a href="#">Dropdown 4</a></li>
                            </ul>
                        </li>
                        <li><a href="#events">Diet</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                    <i className="mobile-nav-toggle d-xl-none" onClick={mobileNavToggle}><FontAwesomeIcon icon={isOpenMobileNav ? faXmark : faBars} /></i>
                </nav> */}

                <a href="/" className="logo d-flex align-items-center me-xl-0">
                    <h1 className="sitename">Yummy</h1>
                </a>

                {/* <form className="search-form d-flex flex-grow-1 order-2">
                    <div className="input-group">
                        <input type="text" className="form-control search-input" placeholder="Enter ingredirnts or recipe names" aria-label="Recipient's username" aria-describedby="button-addon2" />
                        <button className="btn btn-search" type="button" id="button-addon2">
                            <FontAwesomeIcon icon={faSearch} />
                        </button>
                    </div>
                </form> */}

                <Link 
                    className="btn btn-link text-decoration-none text-dark fw-medium d-flex align-items-center gap-2 px-2 hover-scale order-2"
                    to={'/recipe-list'}
                >
                    <BookOpen size={18} className="text-secondary" />
                    <span className="d-none d-sm-inline">Recipes</span>
                </Link>

                <Link
                    className="btn btn-link text-decoration-none text-dark fw-medium d-flex align-items-center gap-2 px-2 hover-scale order-2"
                    to={"/meal-plans/"}
                >
                    <CalendarDays size={18} className="text-secondary" />
                    <span className="d-none d-sm-inline">Meal Plans</span>
                </Link>

                <Link
                    className="btn btn-link text-decoration-none text-dark fw-medium d-flex align-items-center gap-2 px-2 hover-scale order-2"
                    to={"/shopping-list/"}
                >
                    <ShoppingCart size={18} className="text-secondary" />
                    <span className="d-none d-sm-inline">Shopping List</span>
                </Link>

                <div className="dropdown-center dropdown d-flex order-2 btn-header">
                    <button className="btn btn-secondary dropdown-toggle btn-newrecipe text-dark fw-medium d-flex align-items-center gap-2 px-2 hover-scale" type="button" data-bs-toggle="dropdown" data-bs-offset="-30,10" aria-expanded="false">
                        <div className="d-flex align-items-center justify-content-center bg-orange-light text-orange rounded-circle p-2">
                            <PlusCircle size={18} />
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
                        <User size={18} className="text-secondary" />
                        <span>{`Hi, ${currentUser}`}</span>
                    </Link>
                ) : (
                    <Link className="order-2 icon-circle bg-warning text-white rounded-circle" to={"/login"}><User size={16} /></Link>
                )}


            </div>
        </header>
    )
}

export default Header;
