import { useRef, useState } from "react";
import './notes-editor.scss'
import { faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const NotesEditor = () => {

    const [ notes, setNotes ] = useState<string>('');
    const [ newNotes, setNewNotes ] = useState<string>('');
    const [ newValue, setNewValue ] = useState<string>('');
    const newNotesRef = useRef<HTMLTextAreaElement>(null);
    const [ hasNotes, setHasNotes ] = useState<boolean>(false);
    const handleAddNotes = () => {
        if(newNotesRef.current && newNotesRef.current.value) {
            setNotes(newNotesRef.current!.value);
            setHasNotes(true);
        }
        setNewNotes("");
    }
    const handleRemoveNotes = () => {
        setNotes('');
        setHasNotes(false);
    }
    const handleEditNotes = (newValue: string) => {
        setNotes(newValue);
    }

    return (
        <div>
            {
                notes &&  <div className='p-3 my-2 notes-item d-flex flex-row align-items-center justify-content-between gap-2'>
                    <span >{notes}</span>
                    <div className="d-flex gap-2">
                        <FontAwesomeIcon type='button' icon={faXmark} data-bs-toggle="modal" data-bs-target="#removeNotesModal" />
                        <div className="modal remove-notes-modal fade" id="removeNotesModal">
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header border-0">
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body text-center p-0">
                                        <h5>Delete Notes?</h5>
                                    </div>
                                    <div className="modal-footer border-0">
                                        <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                        <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleRemoveNotes()}>Yes</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <FontAwesomeIcon type='button' icon={faPen} data-bs-toggle="modal" data-bs-target="#editNotesModal" />
                        <div className="modal edit-notes-modal fade" id="editNotesModal">
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header border-0">
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body text-center p-0">
                                        <textarea 
                                            className='edit-notes-input'
                                            defaultValue={notes}
                                            onChange={(e) => setNewValue(e.target.value)}/>
                                    </div>
                                    <div className="modal-footer border-0">
                                        <button type="button" className="btn btn-secondary border-0" data-bs-dismiss="modal">Cancel</button>
                                        <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleEditNotes(newValue)}>Update</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
        
            {
                !hasNotes && <div className="input-group align-items-center">
                    <div className="form-floating">
                        <textarea 
                            ref={newNotesRef} 
                            className="form-control" 
                            placeholder="Leave a comment here" 
                            id="addNotes"
                            value={newNotes} 
                            onChange={(e) => setNewNotes(e.target.value)}
                        >
                        </textarea>
                        <label htmlFor="addNotes">Click to Add Notes</label>
                    </div>
                    <span className='input-group-prepend add-notes-wrapper mx-2'>
                        <button className="btn btn-primary btn-sm btn-add-notes" 
                            type="button" 
                            onClick={handleAddNotes}>
                            Add
                        </button>   
                    </span>
                </div>
            }
        </div>
    )
}

export default NotesEditor;