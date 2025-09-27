import { useEffect, useState } from 'react';
import './category.scss'
import { Link, Outlet, useLocation } from "react-router-dom";
import { CATEGORIES } from "../../constants";

const Category = () => {

    const [defaultTab, setDefaultTab] = useState<boolean>(false);

    useEffect(() => {
        setDefaultTab(true);
    }, [])

    return (
        <section id="type-nav" className="category section type-nav">

            <div className="container">

                <ul className="nav nav-tabs d-flex justify-content-center" data-aos="fade-up" data-aos-delay="100">

                    {
                        CATEGORIES.map((category, index) => 
                            <li className="nav-item" key={category.name}>
                                <a className={`nav-link show ${ index === 0 && defaultTab ? 'active' : '' }`} data-bs-toggle="tab" data-bs-target={`#category-${ category.name }`} onClick={() => setDefaultTab(false)}>
                                    <h4>{ category.name }</h4>
                                </a>
                            </li>
                        )
                    }

                </ul>

                <div className="tab-content" data-aos="fade-up" data-aos-delay="200">

                    {
                        CATEGORIES.map((category, index) => 
                            <div className={`tab-pane fade show ${ index === 0 && defaultTab ? 'active' : '' }`} key={category.name} id={`category-${ category.name }`}>

                                <div className="row gy-4">
                                    {
                                        category.values.map((value) => 
                                            <div className="col-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="100" key={value}>
                                                <Link to={`/recipe-list/?${category.name}=${value}`}>
                                                    <div className="type-member">
                                                        <div className="member-img">
                                                            <img src="../img/chefs/chefs-1.jpg" className="img-fluid" alt="" />
                                                        </div>
                                                        <div className="member-info">
                                                            <h4>{ value }</h4>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </div>
                                        )
                                    }
                                </div>
                            </div>
                        )
                    }

                </div>

            </div>

        </section>
    )
}

export default Category;