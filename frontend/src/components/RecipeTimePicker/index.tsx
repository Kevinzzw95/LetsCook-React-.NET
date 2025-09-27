import { useState } from 'react';
import './recipe-time-picker.scss';
import { TimeArray } from '../../constants';

type Props = {
    onSelectTime: (min: string, hour: string) => void;
    type: string;
}

const RecipeTimePicker = ({ onSelectTime, type }: Props) => {

    const [hour, setHour] = useState<string>('00');
    const [min, setMin] = useState<string>('00');

    const handleSelectHour = (hour: string) => {
        setHour(hour);
        onSelectTime(hour, min);
    }

    const handleSelectMin = (min: string) => {
        setMin(min);
        onSelectTime(hour, min);
    }

    return (
        <div>
            <div>
                <button className="btn btn-timepicker w-100" type="button" data-bs-toggle="collapse" data-bs-target={`#${type}`} aria-expanded="false" aria-controls={type}>
                    {hour + ' Hours ' + min + ' Minutes'}
                </button>
            </div>
            <div id={type} className="time-picker-wrapper collapse mt-1">
                <div className='d-flex w-100 h-100'>
                    <ul className='col-6 d-flex flex-column align-items-center p-2'>
                        {
                            TimeArray(24).map((value, index) => 
                                <li key={index} className={hour === value ? 'selected' : ''} onClick={() => handleSelectHour(value)}>
                                    {value}
                                </li>
                            )
                        }
                    </ul>
                        
                    <ul className='col-6 d-flex flex-column align-items-center p-2'>
                        {
                            TimeArray(59).map((value, index) => 
                                <li key={index} className={min === value ? 'selected' : ''} onClick={() => handleSelectMin(value)}>
                                    {value}
                                </li>
                            )
                        }
                    </ul>
                </div>
            </div>
        </div>
        
    )
    
}

export default RecipeTimePicker;