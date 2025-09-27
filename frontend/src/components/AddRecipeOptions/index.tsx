import { Link } from 'react-router-dom';
import './add-recipe-options.scss'

const AddRecipeOptions = () => {
    

    return (
        <ul className="dropdown-menu add-recipe-dropdown">
            <li><Link className="dropdown-item" to={"/new-recipe"}>Add Manually</Link></li>
            <li><Link className="dropdown-item" to={"/new-recipe"}>Upload From An Image</Link></li>
            <li><a className="dropdown-item" href="#">Action three</a></li>
        </ul>
    )
}

export default AddRecipeOptions;