import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './edit-recipe.scss';
import { useEffect, useState } from 'react';
import ImageEditor from '../../components/RecipeEditor/ImageEditor';
import OverviewEditor from '../../components/RecipeEditor/OverviewEditor';
import IngredientsEditor from '../../components/RecipeEditor/IngredientsEditor';
import StepsEditor from '../../components/RecipeEditor/StepsEditor';
import NotesEditor from '../../components/RecipeEditor/NotesEditor';
import { FormProvider, FieldValues, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { validationSchema } from '../../admin/recipeFormValidation';
import { importedRecipe, recipeCommon } from '../../types/recipe';
import ScanRecipeEditor from '../../components/RecipeEditor/ScanRecipeEditor';
import RecipeDetails from '../RecipeDetails';
import Preview from '../../components/RecipeEditor/Preview';
import { useCreateRecipeMutation } from '../../redux/recipe/recipeApiSlice';
import UploadByUrlEditor from '../../components/RecipeEditor/UploadByUrlEditor';

interface Props {
    recipe?: recipeCommon;
    cancelEdit: () => void;
}

const EditRecipe = () => {

    const tabs: string[] = [
        'Upload Recipes',
        'Overview',
        'Ingredients',
        'Steps',
        'Notes',
        'Images'
    ]
    const [ currTab, setCurrTab ] = useState<string>(tabs[0]);
    const [ hasErrors, setHasErrors ] = useState<boolean>(false);
    const [ currRecipe, setCurrRecipe  ] = useState<importedRecipe>();
    const [ isModalOpen, setIsModalOpen ] = useState<boolean>(false);
    const methods = useForm({
        resolver: yupResolver<FieldValues>(validationSchema),
    });
    const [
        createRecipe, // This is the mutation trigger
        { isLoading: isUpdating }, // This is the destructured mutation result
    ] = useCreateRecipeMutation();
    const {
        reset,
        handleSubmit,
        watch,
        formState: { isSubmitting, isDirty }
    } = methods;
    const handleSubmitData = (data: FieldValues) => {
        data['SourceName'] = 'image';
        console.log(data);
        createRecipe(data);
    };

    useEffect(() => {
        const observer = new MutationObserver((mutationsList, observer) => {
            mutationsList.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const element = document.querySelector('.create-recipe-error');
                    if (element) {
                        setHasErrors(true);
                    } else {
                        setHasErrors(false);
                    }
                }
            });
        });
    
        // Observe changes in the document body or a specific parent element
        observer.observe(document.body, { childList: true, subtree: true });
    
        // Cleanup the observer when the component unmounts
        return () => observer.disconnect();
    }, []);

    const watchFile = watch("file", null);
    useEffect(() => {
        //if (recipe && !watchFile && !isDirty) reset(recipe);
        return () => {
            if (watchFile) URL.revokeObjectURL(watchFile.preview);
        };
    }, [reset, watchFile, isDirty]);

    return (
        <>
            <div className="container newrecipe-container">
                <FormProvider {...methods}>
                    <form id="createRecipe" onSubmit={handleSubmit(handleSubmitData)}>
                        <div className='newrecipe-heading d-flex justify-content-center my-3'>
                            <h3 className='mb-0'>Edit Recipe</h3>
                            <input type="submit" className="btn btn-newrecipe-submit px-0" value="Save Recipe" />
                        </div>
                        {hasErrors && 
                            <div>
                                <p>Whoops, Some feilds are invalid. Please check and put valid data to submit.</p>
                            </div>
                        }
                        <div className='newrecipe-tabs d-flex justify-content-center p-2'>
                            <ul className="nav nav-pills nav-fill w-100">
                                {
                                    tabs.map((tab) => 
                                        <li className="nav-item" key={tab}>
                                            <a className={`nav-link p-1 p-md-2 ${currTab === tab ? 'active' : ''}`} aria-current="page" href="#" onClick={() => setCurrTab(tab)}>{tab}</a>
                                        </li>
                                    ) 
                                }
                            </ul>
                        </div> 
                        <div className='d-flex newrecipe-content mt-3 p-2 p-md-4 justify-content-center'>
                            <div className={`${currTab === 'Upload Recipes' ? 'col-12 align-self-center' : 'd-none'}`}>
                                <UploadByUrlEditor currRecipe={currRecipe} setCurrRecipe={setCurrRecipe} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
                                <ScanRecipeEditor currRecipe={currRecipe} setCurrRecipe={setCurrRecipe} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
                            </div>
                            <div className={`${currTab === 'Overview' ? '' : 'd-none'}`}>
                                <OverviewEditor currRecipe={currRecipe}/>
                            </div>
                            <div className={`${currTab === 'Steps' ? 'col-12' : 'd-none'}`}>
                                <StepsEditor currRecipe={currRecipe} />
                            </div>
                            <div className={`${currTab === 'Ingredients' ? 'w-100' : 'd-none'}`}>
                                <IngredientsEditor currRecipe={currRecipe}/>
                            </div>
                            <div className={`${currTab === 'Notes' ? 'col-12' : 'd-none'}`}>
                                <NotesEditor />
                            </div>
                            <div className={`d-flex flex-wrap justify-content-between justify-content-md-start w-100 ${currTab === 'Images' ? '': 'd-none'}`}>
                                <ImageEditor currRecipe={currRecipe}/>
                            </div>
                        </div>
                    </form>
                </FormProvider>
            </div>
            {isModalOpen && (
                <div className="recipe-confirmation-modal">
                    <div className="recipe-confirmation-modal-content">
                        <div className='recipe-confirmation-modal-body'>
                            <Preview { ...currRecipe!} />
                        </div>
                        <div className='d-flex justify-content-end gap-2 mt-3'>
                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" >Save</button>
                            <button className='btn btn-secondary border-0' onClick={() => setIsModalOpen(false)}>Edit</button>
                        </div>
                    </div>
                </div>
            )}
        </>
        
    )
}

export default EditRecipe;