import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Lock, Mail, Save, UserRoundPen } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../redux/auth/authSlice';
import { useGetCurrentUserQuery, useUpdateProfileMutation } from '../../redux/auth/authApiSlice';
import { UpdateProfilePayload } from '../../types/user';
import './profile.scss';

const Profile = () => {
    const dispatch = useDispatch();
    const { data: currentUser } = useGetCurrentUserQuery();
    const [updateProfile, { isLoading, isSuccess }] = useUpdateProfileMutation();
    const {
        register,
        handleSubmit,
        reset
    } = useForm<UpdateProfilePayload>({
        defaultValues: {
            username: '',
            email: '',
            currentPassword: '',
            newPassword: ''
        }
    });

    useEffect(() => {
        if (!currentUser) return;

        reset({
            username: currentUser.username,
            email: currentUser.email,
            currentPassword: '',
            newPassword: ''
        });
    }, [currentUser, reset]);

    const onSubmit = async (data: UpdateProfilePayload) => {
        const payload: UpdateProfilePayload = {
            username: data.username,
            email: data.email
        };

        if (data.newPassword) {
            payload.currentPassword = data.currentPassword;
            payload.newPassword = data.newPassword;
        }

        const result = await updateProfile(payload).unwrap();

        dispatch(setCredentials({
            user: result.username,
            token: result.token,
            refreshToken: result.refreshToken ?? null
        }));

        reset({
            username: result.username,
            email: result.email,
            currentPassword: '',
            newPassword: ''
        });
    };

    return (
        <div className="container py-4 profile-page animate-fade-in">
            <div className="card-glass profile-card p-4 p-lg-5">
                <div className="mb-4">
                    <h1 className="h3 fw-bold mb-1">Your Profile</h1>
                    <p className="text-secondary mb-0">Update your username, email, and password.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3">
                    <div>
                        <label className="form-label fw-semibold">Username</label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <UserRoundPen size={18} />
                            </span>
                            <input className="form-control border-start-0" {...register('username', { required: true })} />
                        </div>
                    </div>

                    <div>
                        <label className="form-label fw-semibold">Email</label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <Mail size={18} />
                            </span>
                            <input type="email" className="form-control border-start-0" {...register('email', { required: true })} />
                        </div>
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Current Password</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <Lock size={18} />
                                </span>
                                <input type="password" className="form-control border-start-0" {...register('currentPassword')} />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">New Password</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <Lock size={18} />
                                </span>
                                <input type="password" className="form-control border-start-0" {...register('newPassword')} />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-sunny rounded-pill fw-semibold align-self-start px-4 mt-2" disabled={isLoading}>
                        <Save size={16} className="me-2" />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>

                    {isSuccess && (
                        <p className="text-success mb-0">Profile updated.</p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Profile;
