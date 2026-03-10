import './filter.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faLeaf } from '@fortawesome/free-solid-svg-icons';
import { useSearchParams } from 'react-router-dom';
import { REFINEMENTS } from '../../constants';

type Props = {
    isOpenMobileFilter: boolean;
    openFilter: () => void;
};


const Filter = ({ isOpenMobileFilter, openFilter }: Props) => {

    const [ searchParams, setSearchParams ] = useSearchParams();

    const clickFilterHandler = (filterName: string, filterValue: string) => {
        searchParams.set(filterName, filterValue);
        setSearchParams(searchParams);
    };

    return (
        <div className={`refinement-bar card-glass py-4 px-2 d-lg-block ${isOpenMobileFilter ? 'active' : ''}`}>
            <div className="refinement-container">
                <div className='refinement-header py-2 d-md-none'>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <span className="search-result-count justi">
                                142 Results
                            </span>
                        </div>
                        <button className="close" onClick={ openFilter }>
                            <span>Close</span>
                            <FontAwesomeIcon className='px-1' icon={faXmark} />
                        </button>
                    </div>
                </div>
                <div className="accordion w-bold text-secondary text-uppercase small mb-2 d-block" id="accordionRefinement">
                    {
                        REFINEMENTS && Object.keys(REFINEMENTS).map((refinementName) => 
                            <div className="accordion-item" key={refinementName}>
                                <h2 className="accordion-header">
                                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#collapse${refinementName}`} aria-expanded="false" aria-controls={`#collapse${refinementName}`}>
                                        {refinementName}
                                    </button>
                                </h2>
                                <div id={`collapse${refinementName}`} className={`accordion-collapse collapse ${REFINEMENTS[refinementName].includes(searchParams.get(refinementName)!) ? 'show' : ''}`}>
                                    <div className="accordion-body">
                                        <ul className='row row-cols-3 row-cols-xl-4 px-2'>
                                            {
                                                REFINEMENTS[refinementName] && REFINEMENTS[refinementName].map((refinementValue, index) => 
                                                    <li key={index} className='type-list-item col px-1'>
                                                        <div className='card my-2'>
                                                            <div className={`card-body flex-column ${ refinementValue.toUpperCase() === searchParams.get(refinementName)?.toUpperCase() ? 'active' : '' }`} onClick={() => clickFilterHandler(refinementName, refinementValue)}> 
                                                                <FontAwesomeIcon icon={faLeaf} />
                                                                <p className="w-100 mt-2 mb-0">
                                                                    {refinementValue}
                                                                </p>                                  
                                                            </div>
                                                        </div>
                                                    </li>
                                                )
                                            }
                                        </ul>   
                                    </div>
                                </div>
                            </div>
                        )
                    } 
                </div>
            </div>
        </div>                                                                            
    )
}

export default Filter;