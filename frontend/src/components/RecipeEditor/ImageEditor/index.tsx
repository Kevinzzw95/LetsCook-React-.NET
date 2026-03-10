import { faCirclePlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import './image-editor.scss';
import { useEffect, useState } from "react";
import { useDropzone } from 'react-dropzone';
import { RecipeDraft } from "../../../types/recipe";
import { Control, useFormContext, UseFormRegister } from "react-hook-form";
import { Upload, X } from "lucide-react";

type Props = {
    currRecipe: RecipeDraft;
    updateData: (updates: Partial<RecipeDraft>) => void;
    control: Control<RecipeDraft>;
    register: UseFormRegister<RecipeDraft>;
}

const ImageEditor = ({currRecipe, updateData, control, register}: Props) => {
    const { watch, reset, setValue, formState: { errors }} = useFormContext();
    const watchImages = watch("images", []);

    const handleRemoveImage = (targetIndex: number) => {
        updateData({ images: currRecipe.images!.filter((_, index) => index !== targetIndex) });
    };  

    const onDrop = (acceptedFiles: File[]) => {
        //const file = acceptedFiles[0];
        //addFile(file);
        setValue("images", [...watchImages, acceptedFiles[0]]);
        updateData({ images: [...(currRecipe.images ?? []), acceptedFiles[0]] });
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
        }
    }, [currRecipe?.images, setValue]);

    useEffect(() => {

    }, [reset]);

    return (
        <>
            <div className='add-pictures col-6 p-2 d-flex align-items-center justify-content-center mx-md-2 cursor-pointer border-orange-dashed bg-orange-light rounded-4 p-5 hover-shadow transition-all' {...getRootProps()}>
                <input className="d-none" {...getInputProps()}/>

                <label htmlFor="files" className='add-icon-wrapper text-center'>
                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm" style={{ width: '64px', height: '64px' }}>
                        <Upload size={32} className="text-orange" />
                    </div>
                    <h3 className="h5 fw-semibold text-dark mb-1">
                        Upload Photos
                    </h3>
                    <p className="text-muted small mb-0">
                        Click to browse or drag and drop your delicious photos here
                    </p>
                </label>
            </div>
            {
                currRecipe.images && currRecipe.images.map((file, index) => 
                    <div className='selected-image col-6 col-md-3 d-flex justify-content-center position-relative mx-md-2' key={index}>
                        <button
                            type="button"
                            className="btn btn-light text-danger btn-sm rounded-circle position-absolute top-0 end-0 m-2 p-0 m-2 d-flex align-items-center justify-content-center shadow-sm"
                            data-bs-toggle="modal" 
                            data-bs-target={`#removeImagesModal${index}`}
                            style={{ width: '24px', height: '24px' }}
                        >
                            <X size={14} />
                        </button>
                        <div className="modal remove-ingredient-modal fade" id={`removeImagesModal${index}`}>
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
                        {file && <img src={URL.createObjectURL(file)} alt="Selected preview" className="object-fit-cover w-100 border rounded w-100" />}
                    </div>
                )
            }
        </>
    )
}

export default ImageEditor;