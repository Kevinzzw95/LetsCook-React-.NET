import { faBars, faPlus, faSearch, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import './header.scss';
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import classnames from 'classnames';
import { faUser } from "@fortawesome/free-regular-svg-icons";
import { Link } from "react-router-dom";
import AddRecipeOptions from "../AddRecipeOptions";

const Header = () => {

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
            <div className="container position-relative d-flex align-items-center justify-content-between gap-2">

                <nav id="navmenu" className="navmenu d-xl-none">
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
                </nav>

                <a href="/" className="logo d-flex align-items-center me-xl-0">
                    <h1 className="sitename">Yummy</h1>
                </a>

                <form className="search-form d-flex flex-grow-1 order-2">
                    {/* <div className="input-group input-group-lg">
                        <input type="text" className="form-control" placeholder="Enter Ingredients" aria-label="Enter Ingredients" aria-describedby="basic-addon2" />
                        <select className="custom-select" id="inputGroupSelect">
                            <option value="1">One</option>
                            <option value="2">Two</option>
                            <option value="3">Three</option>
                        </select>
                    </div>
                    <button className="btn btn-lg btn-secondary search-submit" type="submit">
                        <FontAwesomeIcon icon={faSearch} />
                    </button> */}
                    <div className="input-group">
                        <input type="text" className="form-control search-input" placeholder="Enter ingredirnts or recipe names" aria-label="Recipient's username" aria-describedby="button-addon2" />
                        <button className="btn btn-search" type="button" id="button-addon2">
                            <FontAwesomeIcon icon={faSearch} />
                        </button>
                    </div>
                </form>

                <div className="dropdown-center dropdown d-flex order-2 btn-header">
                    <button className="btn btn-secondary dropdown-toggle btn-newrecipe text-end py-1 px-md-2" type="button" data-bs-toggle="dropdown" data-bs-offset="-30,10" aria-expanded="false">
                        <div className="add-recipe-label d-none d-md-block">Add New Recipes</div>
                        <FontAwesomeIcon className='d-md-none' icon={faPlus} />
                    </button>
                    <AddRecipeOptions />
                </div>
                <Link className="order-2 btn-header" to={"/login"}><FontAwesomeIcon icon={faUser} /></Link>


            </div>

            <div className="container d-none d-xl-flex justify-content-center">
                <nav id="navmenu" className="navmenu">
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
                </nav>
            </div>
        </header>
    )
}

export default Header;