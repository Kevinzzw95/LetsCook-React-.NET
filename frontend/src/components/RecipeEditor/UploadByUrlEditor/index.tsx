import axios from "axios";
import { useRef, useState } from "react";
import { RecipeDraft } from "../../../types/recipe";
import './upload-by-url-editor.scss';
import Preview from "../Preview";
import { useCreateRecipeByUrlMutation } from "../../../redux/recipe/recipeAiApiSlice";

interface Props {
    currRecipe: RecipeDraft;
    updateData: (updates: Partial<RecipeDraft>) => void;
    isModalOpen: boolean;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const UploadByUrlEditor = ({currRecipe, updateData, isModalOpen, setIsModalOpen }: Props) => {
    const [recipeUrl, setRecipeUrl] = useState<string>('');
    const [createRecipeByUrl, { isLoading, isSuccess, error }] = useCreateRecipeByUrlMutation();

    const handleUrlUpload = async () => {
        if (recipeUrl) {
            try {
                const res = await createRecipeByUrl(recipeUrl).unwrap();
                const newRecipe = {
                    title: res.title,
                    servings: res.servings,
                    sourceName: 'image',
                    ingredients: res.ingredients,
                    steps: res.steps,
                    images: []
                };
                updateData(newRecipe);
                setIsModalOpen(true);
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }
    };

    return (
        <div className="d-flex justify-content-center">
            <div className="row col-10">
                <div className="input-group mb-3 px-0">
                    <input type="text" className="form-control border-0" placeholder="Enter Recipe URL" aria-label="Enter Recipe URL" aria-describedby="button-addon2" value={recipeUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipeUrl(e.target.value)} />
                    <button className="btn btn-lg btn-sunny" type="button" id="button-addon2" onClick={handleUrlUpload}>Get the Recipe</button>
                </div>
            </div>
            {
                isLoading && 
                <div className="background-spinner d-flex justify-content-center align-items-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            }
        </div>
    )
}

export default UploadByUrlEditor;