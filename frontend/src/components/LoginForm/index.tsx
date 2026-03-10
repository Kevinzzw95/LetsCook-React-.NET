// src/LoginForm.js
import React, { useEffect, useState } from 'react';
import './login-form.scss';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useLoginMutation } from '../../redux/auth/authApiSlice';
import { postAuth } from '../../types/user';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../redux/auth/authSlice';
import { ArrowRight, Mail, Lock } from 'lucide-react';

const LoginForm = () => {

	const dispatch = useDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const {
		register,
		handleSubmit,
		formState: { isSubmitting, errors, isValid },
		setError,
		getValues,
		reset
	} = useForm<postAuth>({
		mode: "onTouched",
	});

	const [
		login, // This is the mutation trigger
		{ isLoading: isLoading, isSuccess: isSuccess }, // This is t he destructured mutation result
	] = useLoginMutation();

	useEffect(() => {
		reset();
	}, [isSuccess]);

	const handleSubmitData = async (data: postAuth) => {
		try {
			const user = getValues('username');
			const result = await login(data).unwrap();
			const token = result.token;
			console.log(result)
			dispatch(setCredentials({ token: token, user: user }));
			console.log('Login successfully:', result);
			navigate(location.state?.from || '/recipe-list');
		} catch (err) {
			console.error('Login failed:', err); 
		}
	}

	return (
		isLoading ? <h1>iLoading...</h1> : 
		<>
			<form onSubmit={handleSubmit(handleSubmitData)} className="d-flex flex-column gap-3">

				<div className="form-group">
					<label className="form-label text-secondary fw-medium small text-uppercase">UserName</label>
					<div className="input-group">
						<span className="input-group-text bg-white border-end-0 rounded-start-3 text-secondary ps-3">
							<Mail size={18} />
						</span>
						<input
							className="form-control border-start-0 ps-2"
							type="text"
							id="username"
							required
							{...register("username", { required: "Username is required" })}
						/>
						{errors.username && <div className="error-message">{errors.username.message}</div>}
					</div>
				</div>
          
				<div className="form-group">
					<label className="form-label text-secondary fw-medium small text-uppercase">Email Address</label>
					<div className="input-group">
						<span className="input-group-text bg-white border-end-0 rounded-start-3 text-secondary ps-3">
							<Mail size={18} />
						</span>
						<input
							type="email"
							className="form-control border-start-0 ps-2"
							placeholder="chef@example.com"
							required
							{...register("email", { required: "Email is required" })}
							style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
						/>
					</div>
				</div>

				<div className="form-group mb-2">
					<div className="d-flex justify-content-between align-items-center">
						<label className="form-label text-secondary fw-medium small text-uppercase">Password</label>
						<a href="#" className="small text-orange text-decoration-none fw-medium">Forgot?</a>
					</div>
					<div className="input-group">
						<span className="input-group-text bg-white border-end-0 rounded-start-3 text-secondary ps-3">
							<Lock size={18} />
						</span>
						<input
							type="password"
							className="form-control border-start-0 ps-2"
							placeholder="••••••••"
							id="password"
							required
							{...register("password", {
								pattern: {
								value:
									/(?=^.{6,10}$)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&amp;*()_+}{&quot;:;'?/&gt;.&lt;,])(?!.*\s).*$/,
								message:
									"Password requires 1 capital letter, 1 small-case letter, 1 digit, 1 special character and 6-10 characters long",
								},
								required: "Password is required",
							})}
						/>
						{errors.password && <div className="error-message">{errors.password.message}</div>}
					</div>
				</div>

				<button 
					type="submit" 
					className="btn btn-sunny w-100 py-3 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 mt-2"
					disabled={isLoading}
				>
					{isLoading ? (
						<>Signing In...</>
					) : (
						<>Sign In <ArrowRight size={18} /></>
					)}
				</button>
			</form>

			{/* Footer */}
			<div className="text-center mt-4 pt-3 border-top">
				<p className="text-muted small mb-0">
					Don't have an account? <Link className='text-orange fw-bold text-decoration-none' to='/registration'>Create one</Link>
				</p>
			</div>
		</>
	);
};

export default LoginForm;
