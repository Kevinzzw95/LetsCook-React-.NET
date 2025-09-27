import RegistrationForm from "../../components/RegistrationForm";
import './registration.scss';


const Registration = () => {

    return (
        <>
            <div className='container registration-container h-100'>
                <div className='row'>
                    <div className='col-md-6 registration-background d-flex align-items-end justify-content-center'>
                        <h1 className='d-md-none p-2'>Register</h1>
                    </div>
                    <div className='d-flex col-md-6 registration-content'>
                        <RegistrationForm />
                    </div>
                </div>
                

            </div>
        </>
    )
}

export default Registration;