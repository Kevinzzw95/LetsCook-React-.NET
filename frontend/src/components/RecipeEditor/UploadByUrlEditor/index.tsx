import axios from "axios";
import { useRef, useState } from "react";
import { importedRecipe } from "../../../types/recipe";
import './upload-by-url-editor.scss';
import Preview from "../Preview";
import { useCreateRecipeByUrlMutation } from "../../../redux/recipe/recipeAiApiSlice";

interface Props {
    currRecipe: importedRecipe | undefined;
    setCurrRecipe: React.Dispatch<React.SetStateAction<importedRecipe | undefined>>;
    isModalOpen: boolean;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const UploadByUrlEditor = ({currRecipe, setCurrRecipe, isModalOpen, setIsModalOpen }: Props) => {
    const [recipeUrl, setRecipeUrl] = useState<string>('');
    const [createRecipeByUrl, { isLoading, isSuccess, error }] = useCreateRecipeByUrlMutation();

    const handleUrlUpload = async () => {
        if (recipeUrl) {
            try {
                const res = await createRecipeByUrl(recipeUrl).unwrap();
                setCurrRecipe({
                    title: res.title,
                    servings: res.servings,
                    sourceName: 'image',
                    ingredients: res.ingredients,
                    steps: res.steps,
                    images: []
                });
                setIsModalOpen(true);
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }
    };

    return (
        <div className="d-flex justify-content-center">
            <div className="row col-10">
                <div className="input-group mb-3">
                    <input type="text" className="form-control" placeholder="Enter Recipe URL" aria-label="Enter Recipe URL" aria-describedby="button-addon2" value={recipeUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipeUrl(e.target.value)} />
                    <button className="btn btn-outline-secondary" type="button" id="button-addon2" onClick={handleUrlUpload}>Get the Recipe</button>
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