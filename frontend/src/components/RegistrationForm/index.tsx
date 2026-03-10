import React, { useState } from 'react';
import './registration-form.scss';
import { Link } from 'react-router-dom';
import { FieldValues, useForm } from 'react-hook-form';
import { useUserRegisterMutation } from '../../redux/auth/authApiSlice';
import { Mail, Lock, ArrowRight, UserRoundPen } from 'lucide-react';

type FormData = {
  email: string
  username: string
  password: string
}

const RegistrationForm = () => {
    const {
        register,
        handleSubmit,
        formState: { isSubmitting, errors, isValid },
        setError,
    } = useForm<FormData>({
        mode: "onTouched",
    });

    const [
        userRegister, // This is the mutation trigger
        { isLoading, isSuccess: isSuccess }, // This is the destructured mutation result
    ] = useUserRegisterMutation();

    // Handle form submission
    const handleSubmitData = (data: FieldValues) => {
        try {
            const result = userRegister(data).unwrap();
            console.log('Registered successfully:', result);
        } catch (err) {
            console.error('Registration failed:', err);
        }
    }

    return (
        <>
            {isSuccess ? (
                <section>
                    <h1>Success!</h1>
                    <p>
                        <Link to='/login'>Login</Link>
                    </p>
                </section>
            ) : (
                <>
                    <form onSubmit={handleSubmit(handleSubmitData)} className='d-flex flex-column gap-3'>
                        <div className="form-group">
                            <label className="form-label text-secondary fw-medium small text-uppercase">Email</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0 rounded-start-3 text-secondary ps-3">
                                    <Mail size={18} />
                                </span>
                                <input
                                    type="email"
                                    className="form-control border-start-0 ps-2"
                                    required
                                    autoComplete="email"
                                    {...register("email", {
                                        pattern: {
                                        value: /^\w+[\w-.]*@\w+((-\w+)|(\w*))\.[a-z]{2,3}$/,
                                        message: "Not a valid email address",
                                        },
                                        required: "Email is required",
                                    })}
                                />
                                {errors.email && <div className="error-message">{errors.email.message}</div>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label text-secondary fw-medium small text-uppercase">UserName</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0 rounded-start-3 text-secondary ps-3">
                                    <UserRoundPen size={18} />
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

                        <div className="form-group mb-2">
                            <label className="form-label text-secondary fw-medium small text-uppercase">Password</label>
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

                        <div className="form-group">
                            <label className="form-label text-secondary fw-medium small text-uppercase">Confirm Password</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0 rounded-start-3 text-secondary ps-3">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    className="form-control border-start-0 ps-2"
                                    id="confirmPassword"
                                    required
                                    autoComplete="current-password"
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
                                <>Signing Up...</>
                            ) : (
                                <>Sign Up <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>
                    <div className="text-center mt-4 pt-3 border-top">
                        <p className="text-muted small mb-0">
                            Already Registrated? <Link className='text-orange fw-bold text-decoration-none' to='/login'>Login</Link>
                        </p>
                    </div>
                </>
            )}
        </>
    )
};

export default RegistrationForm;
