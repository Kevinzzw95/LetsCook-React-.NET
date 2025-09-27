import axios from "axios";
import { useRef, useState } from "react";
import { importedRecipe } from "../../../types/recipe";
import './scan-recipe-editor.scss';
import Preview from "../Preview";
import { useUploadImagesMutation } from "../../../redux/recipe/recipeAiApiSlice";

interface Props {
    currRecipe: importedRecipe | undefined;
    setCurrRecipe: React.Dispatch<React.SetStateAction<importedRecipe | undefined>>;
    isModalOpen: boolean;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ScanRecipeEditor = ({currRecipe, setCurrRecipe, isModalOpen, setIsModalOpen }: Props) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadImages, { isLoading, isSuccess, error }] = useUploadImagesMutation();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);
            //const urls = fileArray.map(file => URL.createObjectURL(file));
            setSelectedFiles(fileArray);
            try {
                const res = await uploadImages(fileArray).unwrap();
                setCurrRecipe({
                    title: res.title,
                    servings: res.servings,
                    sourceName: 'image',
                    ingredients: res.ingredients,
                    steps: res.steps,
                    images: fileArray
                });
                setIsModalOpen(true);
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }
    };

    const handleUploadImage = () => {
        fileInputRef.current?.click();
    }

    return (
        <div className="d-flex justify-content-center">
            <div className="row col-10">
                <button className="btn btn-primary btn-lg btn-scan-image" 
                    type="button" 
                    onClick={handleUploadImage}>
                        Upload Images
                </button>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
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

export default ScanRecipeEditor;