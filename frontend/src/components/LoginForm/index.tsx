// src/LoginForm.js
import React, { useState } from 'react';
import './login-form.scss';
import { Link } from 'react-router-dom';

const LoginForm = () => {
  // State to store form data
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();

    // Simple validation
    if (username === '' || password === '') {
      setError('Both fields are required.');
      return;
    }

    // Here you can handle the login logic, like calling an API
    console.log('Login successful', { username, password });

    // Reset form
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="login-form-container">
        <h2 className='d-none d-md-block'>Login</h2>
        <form className='py-2' onSubmit={handleSubmit}>
            <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />
            </div>

            <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button className='btn submit-login' type="submit">Login</button>
        </form>
        <div className='text-center'>
            New User?
            <span className='px-2'><Link to='/registration'>Sign Up</Link></span>
        </div>
    </div>
  );
};

export default LoginForm;
