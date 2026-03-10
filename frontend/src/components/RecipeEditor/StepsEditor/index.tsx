import { useEffect, useRef, useState } from "react";
import './steps-editor.scss'
import { faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Control, useFieldArray, useFormContext, UseFormRegister } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";
import { RecipeDraft } from "../../../types/recipe";
import { ListOrdered, Plus, Trash2 } from "lucide-react";
import { Step } from "../../../types/step";
import { v4 as uuidv4 } from 'uuid';

type Props = {
    currRecipe: RecipeDraft;
    updateData: (updates: Partial<RecipeDraft>) => void;
    control: Control<RecipeDraft>;
    register: UseFormRegister<RecipeDraft>;
}

const StepsEditor = ({currRecipe, updateData, control, register}: Props) => {

    const { formState: { errors } } = useFormContext();
    const { 
        fields: stepFields,
        append: appendStep,
        remove: removeStep,
    } = useFieldArray({
        control,
        name: "steps"
    });
    const [ currStep, setCurrStep ] = useState<number>(currRecipe && currRecipe.steps.length || 0);

    const handleAddStep = () => {
        setCurrStep(currStep + 1);
        const newStep: Step = {
            id: uuidv4(),
            description: '',
            stepNumber: currStep
        };
        appendStep(newStep);
        updateData({ steps: [...currRecipe.steps, newStep] });
    };
    const handleRemoveStep = (index: number, id: string) => { 
        setCurrStep(currStep - 1);
        removeStep(index);
        updateData({ steps: currRecipe.steps.filter((s) => s.id !== id) });
    }
    
    const updateStep = (id: string, value: string) => {
        updateData({
            steps: currRecipe.steps.map((s) =>
                s.id === id ? { ...s, instruction: value } : s
            ),
        });
    };

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h5 fw-semibold text-dark m-0">Instructions</h3>
                <span className="text-muted small">{currRecipe.steps.length} steps</span>
            </div>

            {currRecipe.steps.length === 0 && (
                <div className="text-center py-5 bg-orange-light border-orange-dashed rounded-3">
                    <ListOrdered size={48} className="text-warning opacity-50 mx-auto mb-3" />
                    <p className="text-muted mb-3">Start adding instructions for your masterpiece.</p>
                    <button
                        type="button"
                        onClick={handleAddStep}
                        className="btn btn-sunny px-3"
                    >
                        Add First Step
                    </button>
                </div>
            )}

            <div className="d-flex flex-column gap-3">
                {stepFields.map((step, index) => (
                    <div key={step.id} className="d-flex gap-3">
                        <input {...register(`steps.${index}.id`)} hidden value={step.id} />
                        <input {...register(`steps.${index}.stepNumber`)} hidden value={step.stepNumber} />
                        <div 
                            className="d-flex align-items-center justify-content-center text-white fw-bold rounded-circle flex-shrink-0 mt-1 shadow-sm"
                            style={{ width: '32px', height: '32px', background: 'linear-gradient(to bottom right, #fdba74, #f97316)' }}
                        >
                            {index + 1}
                        </div>
                        <div className="flex-grow-1 position-relative group-hover-parent">
                            <textarea
                                {...register(`steps.${index}.description`)}
                                onChange={(e) => updateStep(step.id, e.target.value)}
                                placeholder={`Describe step ${index + 1}...`}
                                rows={2}
                                className="form-control shadow-sm"
                                style={{ resize: 'none' }}
                            />
                            <button
                                type="button"
                                data-bs-toggle="modal" 
                                data-bs-target={`#removestepsModal${index}`}
                                className="btn btn-light btn-sm text-secondary position-absolute top-0 end-0 mt-2 me-2 p-1 border-0"
                                title="Remove step"
                                style={{ opacity: 0.7 }}
                            >
                                <Trash2 size={14} />
                            </button>
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
                                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleRemoveStep(index, step.id)}>Yes</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {currRecipe.steps.length > 0 && (
                <button
                    type="button"
                    onClick={handleAddStep}
                    className="btn btn-outline-sunny w-100 py-3 mt-2 rounded-3 d-flex align-items-center justify-content-center gap-2 fw-medium"
                >
                    <Plus size={16} /> Add Next Step
                </button>
            )}

            <ErrorMessage
                errors={errors}
                name="steps"
                render={() => <p className='error-input create-recipe-error'>Please add at leat 1 step</p>}
            />
        </>
    )
}

export default StepsEditor;