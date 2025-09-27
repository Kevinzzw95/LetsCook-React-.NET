import { faCirclePlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import './image-editor.scss';
import { useEffect, useState } from "react";
import { useDropzone } from 'react-dropzone';
import { importedRecipe } from "../../../types/recipe";
import { useFormContext } from "react-hook-form";

type Props = {
    currRecipe: importedRecipe | undefined,
}

const ImageEditor = ({currRecipe}: Props) => {
    const { watch, reset, setValue, formState: { errors }} = useFormContext();
    const watchImages = watch("images", []);
    const [previews, setPreviews] = useState<string[]>([]);

    const handleRemoveImage = (taregtIndex: number) => {
        setPreviews(previews.filter((preview, index) => {
            console.log(taregtIndex)
            return index !== taregtIndex;
        }));
    };  

    const onDrop = (acceptedFiles: File[]) => {
        //const file = acceptedFiles[0];
        //addFile(file);
        setValue("images", [...watchImages, acceptedFiles[0]]);
        setPreviews([...previews, URL.createObjectURL(acceptedFiles[0])]);
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': [],
            'image/jpg': [],
            'image/heif': [],
            'image/png': []
        }
    });

    useEffect(() => {
        if(currRecipe?.images) {
            setValue("images", currRecipe.images);
            setPreviews(currRecipe.images.map((image => URL.createObjectURL(image))));
        }
    }, [currRecipe?.images, setValue]);

    useEffect(() => {
        return () => {
          if (previews) previews.map((preview) => URL.revokeObjectURL(preview));
        };
    }, [reset, previews]);

    /* const addFile = (file: File) => {
        if (file) {
            const reader = new FileReader(); // Create a FileReader to read the file
      
            reader.onloadend = () => {
              setImages([...images, reader.result as string]); // Set the image URL as the state
            };
      
            reader.readAsDataURL(file); // Read the file as a data URL
        }
    } */

    return (
        <>
            <div className='add-pictures col-6 col-md-3 p-2 d-flex align-items-center justify-content-center mx-md-2' {...getRootProps()}>
                <input className="d-none" {...getInputProps()}/>

                <label htmlFor="files" className='add-icon-wrapper'>
                    <div className='w-100 d-flex justify-content-center'>
                        <FontAwesomeIcon className='add-icon' icon={faCirclePlus} />
                    </div>
                    <p className='p-2 text-center'>Click or Drag to Add Images</p>
                </label>
            </div>
            {
                previews && previews.map((preview, index) => 
                    <div className='selected-image col-6 col-md-3 d-flex justify-content-center position-relative p-2' key={index}>
                        <FontAwesomeIcon type='button' icon={faXmark} className="position-absolute top-0 end-0 p-3 delete-image" data-bs-toggle="modal" data-bs-target={`#removeIngredientsModal${index}`} />
                        <div className="modal remove-ingredient-modal fade" id={`removeIngredientsModal${index}`}>
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header border-0">
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body text-center p-0">
                                        <h5>Delete image?</h5>
                                    </div>
                                    <div className="modal-footer border-0">
                                        <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                        <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleRemoveImage(index)}>Yes</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {preview && <img src={preview} alt="Selected preview" className="object-fit-fill border rounded w-100" />}
                    </div>
                )
            }
        </>
    )
}

export default ImageEditor;