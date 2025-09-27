import { useEffect, useRef, useState } from "react";
import './steps-editor.scss'
import { faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useFormContext } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import { importedRecipe } from "../../../types/recipe";

type Props = {
    currRecipe: importedRecipe | undefined,
}

const StepsEditor = ({currRecipe}: Props) => {
    const { register, resetField, formState: { errors }} = useFormContext();

    const [ currStep, setCurrStep ] = useState<number>(1);
    const [ steps, setSteps ] = useState<string[]>(currRecipe?.steps || []);
    const [ newStep, setNewStep ] = useState<string>('');
    const [ newValue, setNewValue ] = useState<string>('');
    const newStepRef = useRef<HTMLTextAreaElement>(null);
    const handleAddSteps = () => {
        if(newStepRef.current && newStepRef.current.value) {
            setSteps([...steps, newStepRef.current.value]);
            setCurrStep(currStep + 1);
        }
        setNewStep("");
    }
    const handleRemoveSteps = (taregtIndex: number) => {
        resetField(`instructions[${taregtIndex}]`, { keepDirty: true })
        setCurrStep(currStep - 1);
        setSteps(steps.filter((step, index) => {
            return index !== taregtIndex;
        }));
    }
    const handleEditSteps = (taregtIndex: number, newValue: string) => {
        setSteps(steps.map((step, index) => { 
            if(taregtIndex === index) {
                step = newValue;
            }
            return step;
        }));
    }

    useEffect(() => {
        setSteps(currRecipe?.steps || []);
    }, [currRecipe?.steps]);

    return (
        <>
            {
                steps && steps.map((step, index) =>
                    <div key={index}>
                        <input {...register(`instructionsRaw[${index}]`)} hidden value={step} />
                        <h5>Step { index + 1 }</h5>
                        <div className='p-3 my-2 step-item d-flex flex-row align-items-center justify-content-between gap-2'>
                            <span >{step}</span>
                            <div className="d-flex gap-2">
                                <FontAwesomeIcon type='button' icon={faXmark} data-bs-toggle="modal" data-bs-target={`#removestepsModal${index}`} />
                                <div className="modal remove-step-modal fade" id={`removestepsModal${index}`}>
                                    <div className="modal-dialog">
                                        <div className="modal-content">
                                            <div className="modal-header border-0">
                                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                            </div>
                                            <div className="modal-body text-center p-0">
                                                <h5>Delete "Step { index + 1 }" from steps?</h5>
                                            </div>
                                            <div className="modal-footer border-0">
                                                <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                                <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleRemoveSteps(index)}>Yes</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <FontAwesomeIcon type='button' icon={faPen} data-bs-toggle="modal" data-bs-target={`#editstepsModal${index}`} />
                                <div className="modal edit-step-modal fade" key={index} id={`editstepsModal${index}`}>
                                    <div className="modal-dialog">
                                        <div className="modal-content">
                                            <div className="modal-header border-0">
                                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                            </div>
                                            <div className="modal-body text-center p-0">
                                                <textarea 
                                                    className='edit-step-input'
                                                    defaultValue={step}
                                                    onChange={(e) => setNewValue(e.target.value)}/>
                                            </div>
                                            <div className="modal-footer border-0">
                                                <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                                <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleEditSteps(index, newValue)}>Update</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                )
            }
        
            <div className="input-group align-items-center">
                <div className="form-floating">
                    <textarea 
                        ref={newStepRef} 
                        className="form-control" 
                        placeholder="Leave a comment here" 
                        id={`step${currStep}`}
                        value={newStep} 
                        onChange={(e) => setNewStep(e.target.value)}
                    >
                    </textarea>
                    <label htmlFor={`step${currStep}`}>Add Step {currStep}</label>
                </div>
                <span className='input-group-prepend add-step-wrapper mx-2'>
                    <button className="btn btn-primary btn-sm btn-add-step" 
                        type="button" 
                        onClick={handleAddSteps}>
                        Add
                    </button>   
                </span>
            </div>
            <ErrorMessage
                errors={errors}
                name="instructions"
                render={() => <p className='error-input create-recipe-error'>Please add at leat 1 step</p>}
            />
        </>
    )
}

export default StepsEditor;