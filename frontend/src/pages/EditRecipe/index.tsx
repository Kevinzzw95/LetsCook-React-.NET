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
import { validationSchema } from './recipeFormValidation';
import { RecipeDraft, recipeCommon, Tab } from '../../types/recipe';
import ScanRecipeEditor from '../../components/RecipeEditor/ScanRecipeEditor';
import RecipeDetails from '../RecipeDetails';
import Preview from '../../components/RecipeEditor/Preview';
import { useCreateRecipeMutation, useGetRecipeQuery, useUpdateRecipeMutation } from '../../redux/recipe/recipeApiSlice';
import UploadByUrlEditor from '../../components/RecipeEditor/UploadByUrlEditor';
import { BookOpen, CheckCircle2, ChevronRight, ChefHat, Image as ImageIcon, List } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface Props {
    recipe?: recipeCommon;
    cancelEdit: () => void;
}

const EditRecipe = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const recipeId = id ? Number(id) : null;

    const tabs = [
        { id: Tab.UPLOAD, label: 'Upload Recipes', icon: ImageIcon },
        { id: Tab.OVERVIEW, label: 'Overview', icon: BookOpen },
        { id: Tab.INGREDIENTS, label: 'Ingredients', icon: List },
        { id: Tab.STEPS, label: 'Steps', icon: CheckCircle2 },
        { id: Tab.IMAGES, label: 'Images', icon: ImageIcon }
    ];
    
    const [ currTab, setCurrTab ] = useState<Tab>(Tab.OVERVIEW);
    const [ hasErrors, setHasErrors ] = useState<boolean>(false);
    const [ currRecipe, setCurrRecipe  ] = useState<RecipeDraft>({
        title: '',
        types: '',
        cuisines: '',
        diets: '',
        sourceName: '',
        servings: 1,
        preparationMinutes: 0,
        prepTime: 0,
        ingredients: [],
        steps: [],
        images: [],
    });
    const [ isModalOpen, setIsModalOpen ] = useState<boolean>(false);
    const methods = useForm<RecipeDraft>({
        resolver: yupResolver<RecipeDraft>(validationSchema),
        defaultValues: {
            ingredients: currRecipe.ingredients
        }
    });

    const updateData = (updates: Partial<RecipeDraft>) => {
        setCurrRecipe((prev) => ({ ...prev, ...updates }));
    };

    const [
        createRecipe, // This is the mutation trigger
        { isLoading: isUpdating }, // This is the destructured mutation result
    ] = useCreateRecipeMutation();
    const [updateRecipe, { isLoading: isSavingUpdate }] = useUpdateRecipeMutation();
    const { data: existingRecipe } = useGetRecipeQuery(recipeId!, { skip: !recipeId });

    const {
        reset,
        clearErrors,
        control, 
        register,
        handleSubmit,
        watch,
        formState: { isSubmitting, isDirty, isSubmitted, errors } 
    } = methods;

    const handleSubmitData = async (data: RecipeDraft) => {
        const payload: RecipeDraft = {
            ...data,
            sourceName: 'image',
            images: currRecipe.images ?? data.images ?? []
        };

        const savedRecipeId = recipeId
            ? await updateRecipe({ id: recipeId, recipe: payload }).unwrap()
            : await createRecipe(payload).unwrap();
        navigate(`/recipe-details/${savedRecipeId}`);
    };

    useEffect(() => {
        if (!existingRecipe) return;

        const dishType = Array.isArray(existingRecipe.dishTypes)
            ? existingRecipe.dishTypes[0] ?? ''
            : existingRecipe.dishTypes ?? existingRecipe.dishType ?? '';
        const cuisine = existingRecipe.cuisines ?? existingRecipe.cuisine ?? '';
        const diets = Array.isArray(existingRecipe.diets) ? existingRecipe.diets[0] ?? '' : '';

        const mappedRecipe: RecipeDraft = {
            title: existingRecipe.title,
            servings: existingRecipe.servings,
            preparationMinutes: existingRecipe.preparationMinutes ?? 0,
            types: dishType,
            cuisines: cuisine,
            diets,
            sourceName: existingRecipe.sourceName ?? '',
            ingredients: existingRecipe.extendedIngredients.map((ingredient) => ({
                id: String(ingredient.id),
                name: ingredient.name,
                amount: String(ingredient.amount ?? ''),
                unit: ingredient.unit ?? '',
                image: ingredient.image
            })),
            steps: existingRecipe.instructions.flatMap((instruction) =>
                instruction.steps.map((step, index) => ({
                    id: `${step.stepNumber}-${index}`,
                    stepNumber: step.stepNumber,
                    description: step.description
                }))
            ),
            images: existingRecipe.imageUrls ?? []
        };

        setCurrRecipe(mappedRecipe);
        reset(mappedRecipe);
        clearErrors();
    }, [existingRecipe, reset, clearErrors]);

    useEffect(() => {
        setHasErrors(isSubmitted && Object.keys(errors).length > 0);
    }, [errors, isSubmitted])

    const watchFile = watch("file", null);
    useEffect(() => {
        //if (recipe && !watchFile && !isDirty) reset(recipe);
        return () => {
            if (watchFile) URL.revokeObjectURL(watchFile.preview);
        };
    }, [reset, watchFile, isDirty]);

    const handleNext = (event: Event) => {
        event.preventDefault();
        const currentIndex = tabs.findIndex(t => t.id === currTab);
        if (currentIndex < tabs.length - 1) {
            setCurrTab(tabs[currentIndex + 1].id);
        }
    };

    return (
        <>
            <div className="edit-recipe-container container-fluid d-flex justify-content-center">
                <div className="card-glass d-flex flex-column w-100 newrecipe-container">
                    <FormProvider {...methods}>
                        <form id="createRecipe" onSubmit={handleSubmit(handleSubmitData)}>
                            <div className="d-flex flex-column flex-md-row align-items-center justify-content-center p-3 bg-light border-bottom gap-3">
                                <ul className="col-8 nav nav-pills nav-fill">
                                    {
                                        tabs.map((tab) => { 
                                            const Icon = tab.icon;
                                            return (
                                                <li className="nav-item" key={tab.id}>
                                                    <button 
                                                        type='button'
                                                        className={`nav-link p-1 p-md-2 d-flex align-items-center justify-content-center gap-2 ${currTab === tab.id ? 'active' : ''}`} 
                                                        aria-current="page"
                                                        onClick={() => setCurrTab(tab.id)}>
                                                            <Icon size={16} />
                                                        {tab.label}
                                                    </button>
                                                </li>
                                            );
                                        }) 
                                    }
                                </ul>
                            </div> 
                            {hasErrors && 
                                <div>
                                    <p>Whoops, Some feilds are invalid. Please check and put valid data to submit.</p>
                                </div>
                            }
                            <div className='d-flex flex-column flex-grow-1 position-relative'>
                                <main className="flex-grow-1 p-4 p-md-5 overflow-auto">
                                    <div className={`${currTab === Tab.UPLOAD ? 'col-12 align-self-center text-center py-5 bg-orange-light border-orange-dashed rounded-3' : 'd-none'}`}>
                                        <UploadByUrlEditor currRecipe={currRecipe} updateData={updateData} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
                                        <ScanRecipeEditor currRecipe={currRecipe} updateData={updateData} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
                                    </div>
                                    <div className={`${currTab === Tab.OVERVIEW ? '' : 'd-none'}`}>
                                        <OverviewEditor currRecipe={currRecipe} updateData={updateData} />
                                    </div>
                                    <div className={`${currTab === Tab.STEPS ? 'col-12' : 'd-none'}`}>
                                        <StepsEditor currRecipe={currRecipe} control={control} updateData={updateData} register={register} />
                                    </div>
                                    <div className={`${currTab === Tab.INGREDIENTS ? 'w-100' : 'd-none'}`}>
                                        <IngredientsEditor currRecipe={currRecipe} control={control} updateData={updateData} register={register} />
                                    </div>
                                    <div className={`d-flex flex-wrap justify-content-between justify-content-md-start w-100 gap-2 ${currTab === Tab.IMAGES ? '': 'd-none'}`}>
                                        <ImageEditor currRecipe={currRecipe} control={control} updateData={updateData} register={register}/>
                                    </div> 
                                </main>

                                {
                                    currTab !== Tab.UPLOAD && 
                                    <footer className="p-4 px-md-5 border-top bg-white d-flex justify-content-between align-items-center mt-auto">
                                        <button className="btn btn-light text-secondary fw-medium px-4 py-2 rounded-3">
                                            Cancel
                                        </button>
                                        {currTab !== Tab.IMAGES ? (
                                            <button 
                                                onClick={handleNext}
                                                className="btn btn-dark d-flex align-items-center gap-2 px-4 py-2 rounded-3 shadow"
                                            >
                                                Next Step <ChevronRight size={16} />
                                            </button>
                                        ) : (
                                            <button type="submit" className="btn btn-sunny px-5 py-2 rounded-3 fw-bold shadow">
                                                {recipeId ? 'Save Changes' : 'Publish Recipe'}
                                            </button>
                                        )}
                                    </footer>
                                }
                            </div>
                        </form>
                    </FormProvider>
                </div> 
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
