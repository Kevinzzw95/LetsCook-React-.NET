import LoginForm from '../../components/LoginForm';
import './login.scss'

const Login = () => {

    return (
        <>
            <div className='container login-container h-100'>
                <div className='row'>
                    <div className='col-md-6 login-background d-flex align-items-end justify-content-center'>
                        <h1 className='d-md-none p-2'>Login</h1>
                    </div>
                    <div className='d-flex col-md-6 login-content'>
                        <LoginForm />
                    </div>
                </div>
                

            </div>
        </>
    )
}

export default Login;