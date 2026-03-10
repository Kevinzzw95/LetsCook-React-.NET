import { ChefHat } from "lucide-react";
import RegistrationForm from "../../components/RegistrationForm";
import './registration.scss';


const Registration = () => {

    return (
        <>
            <div className='container-fluid login-container d-flex justify-content-center'>
                <div className='card-glass d-flex p-5 flex-column w-100'>
                    {/* Header / Logo */}
                    <div className="text-center mb-5">
                        <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white shadow-sm mb-3" style={{ width: '80px', height: '80px' }}>
                            <div className="icon-circle bg-warning text-white rounded-circle" style={{ width: '64px', height: '64px', background: 'linear-gradient(to top right, #fb923c, #fcd34d)' }}>
                                <ChefHat size={32} />
                            </div>
                        </div>
                        <h1 className="h3 fw-bold text-dark mb-1">Hello!</h1>
                        <p className="text-secondary">Sign up to SunnySide Kitchen</p>
                    </div>
                    <RegistrationForm />
                </div>
            </div>
        </>
    )
}

export default Registration;