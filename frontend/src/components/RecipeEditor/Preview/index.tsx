import './preview.scss'
import { importedRecipe } from '../../../types/recipe';
 
const Preview = (recipe: importedRecipe) => {
 
    return (
        <>
            {   recipe &&
                <div className='container pt-2 pt-md-5'>
                    <div className='recipe-hero w-100 h-100'>
                        <div className='d-md-flex flex-col flex-md-row-reverse justify-content-md-between'>
                            <img className='hero-bg col-md-5 h-100' src={recipe?.images.length ? URL.createObjectURL(recipe?.images[0]): ''} />
                            <div className='recipe-hero-content col-md-6 d-flex flex-column justify-content-center align-items-left h-100 pt-2'>
                                <h1>{recipe?.title}</h1>
                                {/* <div className='recipe-heading'>
                                    <FontAwesomeIcon icon={faClock} /><span className='px-2'>Time: { recipe?.readyInMinutes } minutes</span>
                                    <FontAwesomeIcon icon={faStar} /><span className='px-2'>Difficulty Level: Hard</span>
                                </div> */}
                            </div>
                        </div>
                    </div>
                    <div className='recipe-details py-2'>
                        <div className='details-header col-md-6 justify-content-between'>
                            <h2>Ingredients</h2>
                            <span className='d-flex justify-content-between'>
                                <span className='px-4'>Servings: { recipe.servings }</span>
                            </span>
                        </div>
                        <div className='details-content d-md-flex justify-content-md-between w-100'>
                            <div className='col-12 col-md-6'>
                                <ul className='px-0'>
                                    {
                                        recipe?.ingredients && recipe.ingredients.map((ingredient, index) =>
                                            <li className='ingredient-item d-flex justify-content-between' key={index}>
                                                <span className='ingredient-name'>{ ingredient.name }</span>
                                                {/* <span>{ (ingredient.measures.metric.amount * servings).toFixed(0) } { ingredient.measures.metric.unitShort }</span> */}
                                            </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        
                    </div>

                    <div className='recipe-details py-2'>
                        <div className='details-header col-md-6 justify-content-between'>
                            <h2>Steps</h2>
                        </div>
                        <div className='details-content'>
                            {
                                recipe.steps && recipe.steps.map((step, index) => 
                                    <div className='step-container' key={index}>
                                        <span className='step-header'>Step {index + 1}</span>
                                        <div className='step-text'>
                                            {step}
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                </div>
            }
        </>
    )
 }
 
 export default Preview; 
