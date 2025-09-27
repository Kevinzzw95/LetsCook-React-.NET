import React, { useState } from 'react';
import './registration-form.scss';
import { Link } from 'react-router-dom';

const RegistrationForm = () => {
    // State to store form data
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
    });

    // State for form errors
    const [errors, setErrors] = useState({
        fullName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
    });

    // Handle change in input fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
        ...formData,
        [name]: value,
        });
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        let formIsValid = true;
        let newErrors = {};

        // Basic validation checks
        if (!formData.fullName) {
        formIsValid = false;
        newErrors.fullName = 'Full name is required.';
        }
        if (!formData.email) {
        formIsValid = false;
        newErrors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        formIsValid = false;
        newErrors.email = 'Email address is invalid.';
        }
        if (!formData.username) {
        formIsValid = false;
        newErrors.username = 'Username is required.';
        }
        if (!formData.password) {
        formIsValid = false;
        newErrors.password = 'Password is required.';
        } else if (formData.password.length < 6) {
        formIsValid = false;
        newErrors.password = 'Password should be at least 6 characters long.';
        }
        if (formData.password !== formData.confirmPassword) {
        formIsValid = false;
        newErrors.confirmPassword = 'Passwords do not match.';
        }

        setErrors(newErrors);

        if (formIsValid) {
        // You can handle form submission logic here, like calling an API
        console.log('Registration successful', formData);

        // Reset form
        setFormData({
            fullName: '',
            email: '',
            username: '',
            password: '',
            confirmPassword: '',
        });
        }
  };

    return (
        <div className="registration-form-container pt-md-0">
            <h2 className='d-none d-md-block'>Register</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    {errors.email && <div className="error-message">{errors.email}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    {errors.username && <div className="error-message">{errors.username}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    {errors.password && <div className="error-message">{errors.password}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
                </div>

                <button className='btn submit-registration' type="submit">Register</button>
            </form>
            <div className='text-center'>
                Already Registrated?
                <span className='px-2'><Link to='/login'>Login</Link></span>
            </div>
        </div>
    );
};

export default RegistrationForm;
