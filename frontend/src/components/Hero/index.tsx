import "./hero.scss"
import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from "@fortawesome/free-solid-svg-icons";

const Hero = () => {

    return (
        <section id="hero" className="hero section">

            <div className="container">
                <div className="row gy-4 justify-content-center justify-content-lg-between">
                    <div className="col-lg-6 order-2 order-lg-1 d-flex flex-column justify-content-center">
                        <h1 data-aos="fade-up">Find Your Recipe</h1>
                        {/* <form className="d-flex">
                            <div className="input-group input-group-lg">
                                <input type="text" className="form-control" placeholder="Enter Ingredients" aria-label="Enter Ingredients" aria-describedby="basic-addon2" />
                                <select className="custom-select" id="inputGroupSelect">
                                    <option value="1">One</option>
                                    <option value="2">Two</option>
                                    <option value="3">Three</option>
                                </select>
                            </div>
                            <div className="row d-md-none">
                                <input className="form-control" type="text" placeholder="Default input" />
                                <select className="form-control">
                                    <option>Default select</option>
                                </select>
                            </div>
                            <button className="btn btn-lg btn-secondary search-submit" type="submit">
                                <FontAwesomeIcon icon={faSearch} />
                            </button>
                        </form> */}
                    </div>
                </div>
            </div>

        </section>
    )
}

export default Hero;