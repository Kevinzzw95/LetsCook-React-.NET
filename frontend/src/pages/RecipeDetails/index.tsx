import ReactDOM from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './recipe-details.scss'
import { useParams } from 'react-router';
import { faClock, faStar } from '@fortawesome/free-regular-svg-icons';
import { faHeart, faComment, faFire, faEgg, faBowlRice, faDroplet } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { instruction } from '../../types/instruction';
import agent from '../../redux/api/agent';
import { useGetRecipeQuery } from '../../redux/recipe/recipeApiSlice';

const RecipeDetails = () => {

    const {id} = useParams<{id: string}>();
    /* const recipe: recipeCommon = {
        "id": 716429,
        "title": "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs",
        "image": "https://img.spoonacular.com/recipes/716429-556x370.jpg",
        "imageType": "jpg",
        "servings": 2,
        "readyInMinutes": 45,
        "cookingMinutes": 25,
        "preparationMinutes": 20,
        "license": "CC BY-SA 3.0",
        "sourceName": "Full Belly Sisters",
        "sourceUrl": "http://fullbellysisters.blogspot.com/2012/06/pasta-with-garlic-scallions-cauliflower.html",
        "spoonacularSourceUrl": "https://spoonacular.com/pasta-with-garlic-scallions-cauliflower-breadcrumbs-716429",
        "healthScore": 19.0,
        "spoonacularScore": 83.0,
        "analyzedInstructions": [],
        "cheap": false,
        "creditsText": "Full Belly Sisters",
        "cuisines": [],
        "dairyFree": false,
        "diets": [],
        "gaps": "no",
        "glutenFree": false,
        "instructions": "",
        "ketogenic": false,
        "lowFodmap": false,
        "occasions": [],
        "sustainable": false,
        "vegan": false,
        "vegetarian": false,
        "veryHealthy": false,
        "veryPopular": false,
        "whole30": false,
        "weightWatcherSmartPoints": 17,
        "dishTypes": [
            "lunch",
            "main course",
            "main dish",
            "dinner"
        ],
        "extendedIngredients": [
            {
                "aisle": "Milk, Eggs, Other Dairy",
                "amount": 1.0,
                "consistency": "solid",
                "id": 1001,
                "image": "butter-sliced.jpg",
                "measures": {
                    "metric": {
                        "amount": 1.0,
                        "unitLong": "Tbsp",
                        "unitShort": "Tbsp"
                    },
                    "us": {
                        "amount": 1.0,
                        "unitLong": "Tbsp",
                        "unitShort": "Tbsp"
                    }
                },
                "meta": [],
                "name": "butter",
                "original": "1 tbsp butter",
                "originalName": "butter",
                "unit": "tbsp"
            },
            {  
                "aisle": "Produce",
                "amount": 2.0,
                "consistency": "solid",
                "id": 10011135,
                "image": "cauliflower.jpg",
                "measures": {
                    "metric": {
                        "amount": 473.176,
                        "unitLong": "milliliters",
                        "unitShort": "ml"
                    },
                    "us": {
                        "amount": 2.0,
                        "unitLong": "cups",
                        "unitShort": "cups"
                    }
                },
                "meta": [
                    "frozen",
                    "thawed",
                    "cut into bite-sized pieces"
                ],
                "name": "cauliflower florets",
                "original": "about 2 cups frozen cauliflower florets, thawed, cut into bite-sized pieces",
                "originalName": "about frozen cauliflower florets, thawed, cut into bite-sized pieces",
                "unit": "cups"
            },
            {
                "aisle": "Cheese",
                "amount": 2.0,
                "consistency": "solid",
                "id": 1041009,
                "image": "cheddar-cheese.png",
                "measures": {
                    "metric": {
                        "amount": 2.0,
                        "unitLong": "Tbsps",
                        "unitShort": "Tbsps"
                    },
                    "us": {
                        "amount": 2.0,
                        "unitLong": "Tbsps",
                        "unitShort": "Tbsps"
                    }
                },
                "meta": [
                    "grated",
                    "(I used romano)"
                ],
                "name": "cheese",
                "original": "2 tbsp grated cheese (I used romano)",
                "originalName": "grated cheese (I used romano)",
                "unit": "tbsp"
            },
            {
                "aisle": "Oil, Vinegar, Salad Dressing",
                "amount": 1.0,
                "consistency": "liquid",
                "id": 1034053,
                "image": "olive-oil.jpg",
                "measures": {
                    "metric": {
                        "amount": 1.0,
                        "unitLong": "Tbsp",
                        "unitShort": "Tbsp"
                    },
                    "us": {
                        "amount": 1.0,
                        "unitLong": "Tbsp",
                        "unitShort": "Tbsp"
                    }
                },
                "meta": [],
                "name": "extra virgin olive oil",
                "original": "1-2 tbsp extra virgin olive oil",
                "originalName": "extra virgin olive oil",
                "unit": "tbsp"
            },
            {
                "aisle": "Produce",
                "amount": 5.0,
                "consistency": "solid",
                "id": 11215,
                "image": "garlic.jpg",
                "measures": {
                    "metric": {
                        "amount": 5.0,
                        "unitLong": "cloves",
                        "unitShort": "cloves"
                    },
                    "us": {
                        "amount": 5.0,
                        "unitLong": "cloves",
                        "unitShort": "cloves"
                    }
                },
                "meta": [],
                "name": "garlic",
                "original": "5-6 cloves garlic",
                "originalName": "garlic",
                "unit": "cloves"
            },
            {
                "aisle": "Pasta and Rice",
                "amount": 6.0,
                "consistency": "solid",
                "id": 20420,
                "image": "fusilli.jpg",
                "measures": {
                    "metric": {
                        "amount": 170.097,
                        "unitLong": "grams",
                        "unitShort": "g"
                    },
                    "us": {
                        "amount": 6.0,
                        "unitLong": "ounces",
                        "unitShort": "oz"
                    }
                },
                "meta": [
                    "(I used linguine)"
                ],
                "name": "pasta",
                "original": "6-8 ounces pasta (I used linguine)",
                "originalName": "pasta (I used linguine)",
                "unit": "ounces"
            },
            {
                "aisle": "Spices and Seasonings",
                "amount": 2.0,
                "consistency": "solid",
                "id": 1032009,
                "image": "red-pepper-flakes.jpg",
                "measures": {
                    "metric": {
                        "amount": 2.0,
                        "unitLong": "pinches",
                        "unitShort": "pinches"
                    },
                    "us": {
                        "amount": 2.0,
                        "unitLong": "pinches",
                        "unitShort": "pinches"
                    }
                },
                "meta": [
                    "red"
                ],
                "name": "red pepper flakes",
                "original": "couple of pinches red pepper flakes, optional",
                "originalName": "couple of red pepper flakes, optional",
                "unit": "pinches"
            },
            {
                "aisle": "Spices and Seasonings",
                "amount": 2.0,
                "consistency": "solid",
                "id": 1102047,
                "image": "salt-and-pepper.jpg",
                "measures": {
                    "metric": {
                        "amount": 2.0,
                        "unitLong": "servings",
                        "unitShort": "servings"
                    },
                    "us": {
                        "amount": 2.0,
                        "unitLong": "servings",
                        "unitShort": "servings"
                    }
                },
                "meta": [
                    "to taste"
                ],
                "name": "salt and pepper",
                "original": "salt and pepper, to taste",
                "originalName": "salt and pepper, to taste",
                "unit": "servings"
            },
            {
                "aisle": "Produce",
                "amount": 3.0,
                "consistency": "solid",
                "id": 11291,
                "image": "spring-onions.jpg",
                "measures": {
                    "metric": {
                        "amount": 3.0,
                        "unitLong": "",
                        "unitShort": ""
                    },
                    "us": {
                        "amount": 3.0,
                        "unitLong": "",
                        "unitShort": ""
                    }
                },
                "meta": [
                    "white",
                    "green",
                    "separated",
                    "chopped"
                ],
                "name": "scallions",
                "original": "3 scallions, chopped, white and green parts separated",
                "originalName": "scallions, chopped, white and green parts separated",
                "unit": ""
            },
            {
                "aisle": "Alcoholic Beverages",
                "amount": 2.0,
                "consistency": "liquid",
                "id": 14106,
                "image": "white-wine.jpg",
                "measures": {
                    "metric": {
                        "amount": 2.0,
                        "unitLong": "Tbsps",
                        "unitShort": "Tbsps"
                    },
                    "us": {
                        "amount": 2.0,
                        "unitLong": "Tbsps",
                        "unitShort": "Tbsps"
                    }
                },
                "meta": [
                    "white"
                ],
                "name": "white wine",
                "original": "2-3 tbsp white wine",
                "originalName": "white wine",
                "unit": "tbsp"
            },
            {
                "aisle": "Pasta and Rice",
                "amount": 0.25,
                "consistency": "solid",
                "id": 99025,
                "image": "breadcrumbs.jpg",
                "measures": {
                    "metric": {
                        "amount": 59.147,
                        "unitLong": "milliliters",
                        "unitShort": "ml"
                    },
                    "us": {
                        "amount": 0.25,
                        "unitLong": "cups",
                        "unitShort": "cups"
                    }
                },
                "meta": [
                    "whole wheat",
                    "(I used panko)"
                ],
                "name": "whole wheat bread crumbs",
                "original": "1/4 cup whole wheat bread crumbs (I used panko)",
                "originalName": "whole wheat bread crumbs (I used panko)",
                "unit": "cup"
            }
        ],
        "summary": "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs might be a good recipe to expand your main course repertoire. One portion of this dish contains approximately <b>19g of protein </b>,  <b>20g of fat </b>, and a total of  <b>584 calories </b>. For  <b>$1.63 per serving </b>, this recipe  <b>covers 23% </b> of your daily requirements of vitamins and minerals. This recipe serves 2. It is brought to you by fullbellysisters.blogspot.com. 209 people were glad they tried this recipe. A mixture of scallions, salt and pepper, white wine, and a handful of other ingredients are all it takes to make this recipe so scrumptious. From preparation to the plate, this recipe takes approximately  <b>45 minutes </b>. All things considered, we decided this recipe  <b>deserves a spoonacular score of 83% </b>. This score is awesome. If you like this recipe, take a look at these similar recipes: <a href=\"https://spoonacular.com/recipes/cauliflower-gratin-with-garlic-breadcrumbs-318375\">Cauliflower Gratin with Garlic Breadcrumbs</a>, < href=\"https://spoonacular.com/recipes/pasta-with-cauliflower-sausage-breadcrumbs-30437\">Pasta With Cauliflower, Sausage, & Breadcrumbs</a>, and <a href=\"https://spoonacular.com/recipes/pasta-with-roasted-cauliflower-parsley-and-breadcrumbs-30738\">Pasta With Roasted Cauliflower, Parsley, And Breadcrumbs</a>.",
        "winePairing": {
            "pairedWines": [
                "chardonnay",
                "gruener veltliner",
                "sauvignon blanc"
            ],
            "pairingText": "Chardonnay, Gruener Veltliner, and Sauvignon Blanc are great choices for Pasta. Sauvignon Blanc and Gruner Veltliner both have herby notes that complement salads with enough acid to match tart vinaigrettes, while a Chardonnay can be a good pick for creamy salad dressings. The Buddha Kat Winery Chardonnay with a 4 out of 5 star rating seems like a good match. It costs about 25 dollars per bottle.",
            "productMatches": [
                {
                    "id": 469199,
                    "title": "Buddha Kat Winery Chardonnay",
                    "description": "We barrel ferment our Chardonnay and age it in a mix of Oak and Stainless. Giving this light bodied wine modest oak character, a delicate floral aroma, and a warming finish.",
                    "price": "$25.0",
                    "imageUrl": "https://img.spoonacular.com/products/469199-312x231.jpg",
                    "averageRating": 0.8,
                    "ratingCount": 1.0,
                    "score": 0.55,
                    "link": "https://www.amazon.com/2015-Buddha-Kat-Winery-Chardonnay/dp/B00OSAVVM4?tag=spoonacular-20"
                }
            ]
        }
    }; */
	const [ equipmentList, setEquipmentList ] = useState<string[]>([]);
	const [ ingredientList, setIngredientList ] = useState<string[]>([]);
    const [ servings, setServings ] = useState<number>(0);

    const { data: recipe, error, isLoading, isFetching, refetch } = useGetRecipeQuery(Number(id));

    const reduceServings = () => {
        if(servings > 1) {
            setServings(servings - 1);
        }
    };

	/* useEffect(() => {
        const instructionsTest: instruction[] = [
            {
                "name": "",
                "steps": [
                    {
                        "equipment": [
                            {
                                "id": 404784,
                                "image": "oven.jpg",
                                "name": "oven",
                                "temperature": {
                                    "number": 200.0,
                                    "unit": "Fahrenheit"
                                }
                            }
                        ],
                        "ingredients": [],
                        "number": 1,
                        "step": "Preheat the oven to 200 degrees F."
                    },
                    {
                        "equipment": [
                            {
                                "id": 404661,
                                "image": "whisk.png",
                                "name": "whisk"
                            },
                            {
                                "id": 404783,
                                "image": "bowl.jpg",
                                "name": "bowl"
                            }
                        ],
                        "ingredients": [
                            {
                                "id": 19334,
                                "image": "light-brown-sugar.jpg",
                                "name": "light brown sugar"
                            },
                            {
                                "id": 19335,
                                "image": "sugar-in-bowl.png",
                                "name": "granulated sugar"
                            },
                            {
                                "id": 18371,
                                "image": "white-powder.jpg",
                                "name": "baking powder"
                            },
                            {
                                "id": 18372,
                                "image": "white-powder.jpg",
                                "name": "baking soda"
                            },
                            {
                                "id": 12142,
                                "image": "pecans.jpg",
                                "name": "pecans"
                            },
                            {
                                "id": 20081,
                                "image": "flour.png",
                                "name": "all purpose flour"
                            },
                            {
                                "id": 2047,
                                "image": "salt.jpg",
                                "name": "salt"
                            }
                        ],
                        "number": 2,
                        "step": "Whisk together the flour, pecans, granulated sugar, light brown sugar, baking powder, baking soda, and salt in a medium bowl."
                    },
                    {
                        "equipment": [
                            {
                                "id": 404661,
                                "image": "whisk.png",
                                "name": "whisk"
                            },
                            {
                                "id": 404783,
                                "image": "bowl.jpg",
                                "name": "bowl"
                            }
                        ],
                        "ingredients": [
                            {
                                "id": 2050,
                                "image": "vanilla-extract.jpg",
                                "name": "vanilla extract"
                            },
                            {
                                "id": 93622,
                                "image": "vanilla.jpg",
                                "name": "vanilla bean"
                            },
                            {
                                "id": 1230,
                                "image": "buttermilk.jpg",
                                "name": "buttermilk"
                            },
                            {
                                "id": 1123,
                                "image": "egg.png",
                                "name": "egg"
                            }
                        ],
                        "number": 3,
                        "step": "Whisk together the eggs, buttermilk, butter and vanilla extract and vanilla bean in a small bowl."
                    },
                    {
                        "equipment": [],
                        "ingredients": [
                            {
                                "id": 1123,
                                "image": "egg.png",
                                "name": "egg"
                            }
                        ],
                        "number": 4,
                        "step": "Add the egg mixture to the dry mixture and gently mix to combine. Do not overmix."
                    },
                    {
                        "equipment": [],
                        "ingredients": [],
                        "length": {
                            "number": 15,
                            "unit": "minutes"
                        },
                        "number": 5,
                        "step": "Let the batter sit at room temperature for at least 15 minutes and up to 30 minutes before using."
                    },
                    {
                        "equipment": [
                            {
                                "id": 404779,
                                "image": "griddle.jpg",
                                "name": "griddle"
                            },
                            {
                                "id": 404645,
                                "image": "pan.png",
                                "name": "frying pan"
                            }
                        ],
                        "ingredients": [],
                        "length": {
                            "number": 3,
                            "unit": "minutes"
                        },
                        "number": 6,
                        "step": "Heat a cast iron or nonstick griddle pan over medium heat and brush with melted butter. Once the butter begins to sizzle, use 2 tablespoons of the batter for each pancake and cook until the bubbles appear on the surface and the bottom is golden brown, about 2 minutes, flip over and cook until the bottom is golden brown, 1 to 2 minutes longer."
                    },
                    {
                        "equipment": [
                            {
                                "id": 404784,
                                "image": "oven.jpg",
                                "name": "oven",
                                "temperature": {
                                    "number": 200.0,
                                    "unit": "Fahrenheit"
                                }
                            }
                        ],
                        "ingredients": [],
                        "number": 7,
                        "step": "Transfer the pancakes to a platter and keep warm in a 200 degree F oven."
                    },
                    {
                        "equipment": [],
                        "ingredients": [
                            {
                                "id": 10014037,
                                "image": "bourbon.png",
                                "name": "bourbon"
                            }
                        ],
                        "number": 8,
                        "step": "Serve 6 pancakes per person, top each with some of the bourbon butter."
                    },
                    {
                        "equipment": [],
                        "ingredients": [
                            {
                                "id": 19336,
                                "image": "powdered-sugar.jpg",
                                "name": "powdered sugar"
                            },
                            {
                                "id": 19911,
                                "image": "maple-syrup.png",
                                "name": "maple syrup"
                            }
                        ],
                        "number": 9,
                        "step": "Drizzle with warm maple syrup and dust with confectioners' sugar."
                    },
                    {
                        "equipment": [],
                        "ingredients": [
                            {
                                "id": 12142,
                                "image": "pecans.jpg",
                                "name": "pecans"
                            }
                        ],
                        "number": 10,
                        "step": "Garnish with fresh mint sprigs and more toasted pecans, if desired."
                    }
                ]
            },
            {
                "name": "Bourbon Molasses Butter",
                "steps": [
                    {
                        "equipment": [
                            {
                                "id": 404669,
                                "image": "sauce-pan.jpg",
                                "name": "sauce pan"
                            }
                        ],
                        "ingredients": [
                            {
                                "id": 10014037,
                                "image": "bourbon.png",
                                "name": "bourbon"
                            },
                            {
                                "id": 19335,
                                "image": "sugar-in-bowl.png",
                                "name": "sugar"
                            }
                        ],
                        "number": 1,
                        "step": "Combine the bourbon and sugar in a small saucepan and cook over high heat until reduced to 3 tablespoons, remove and let cool."
                    },
                    {
                        "equipment": [
                            {
                                "id": 404771,
                                "image": "food-processor.png",
                                "name": "food processor"
                            }
                        ],
                        "ingredients": [
                            {
                                "id": 19304,
                                "image": "molasses.jpg",
                                "name": "molasses"
                            },
                            {
                                "id": 10014037,
                                "image": "bourbon.png",
                                "name": "bourbon"
                            },
                            {
                                "id": 2047,
                                "image": "salt.jpg",
                                "name": "salt"
                            }
                        ],
                        "number": 2,
                        "step": "Put the butter, molasses, salt and cooled bourbon mixture in a food processor and process until smooth."
                    },
                    {
                        "equipment": [
                            {
                                "id": 404730,
                                "image": "plastic-wrap.jpg",
                                "name": "plastic wrap"
                            },
                            {
                                "id": 404783,
                                "image": "bowl.jpg",
                                "name": "bowl"
                            }
                        ],
                        "ingredients": [],
                        "number": 3,
                        "step": "Scrape into a bowl, cover with plastic wrap and refrigerate for at least 1 hour to allow the flavors to meld."
                    },
                    {
                        "equipment": [],
                        "ingredients": [],
                        "length": {
                            "number": 30,
                            "unit": "minutes"
                        },
                        "number": 4,
                        "step": "Remove from the refrigerator about 30 minutes before using to soften."
                    }
                ]
            }
        ]
        //setInstructions(instructionsTest);
        id && agent.Recipe.details(parseInt(id!))
        .then(response => setRecipe(response))
        .catch(error => console.log(error))
        .finally(() => {
            setLoading(false);
        })

	}, [id]); */

    useEffect(() => {
        /* instructions.forEach((instruction) => {
			instruction.steps.forEach((step) => {
				step.equipment?.forEach((e) => {
					e.name && setEquipmentList((equipmentList) => [...equipmentList, e.name]);
				})
				step.ingredients?.forEach((i) => {
					i.name && setIngredientList((ingredientList) => [...ingredientList, i.name]);
				}) 
			});
		}); */
        recipe?.extendedIngredients.forEach((i) => {
            i.name && setIngredientList((ingredientList) => [...ingredientList, i.name]);
        });
        recipe && setServings(recipe.servings);
    }, [recipe]);
 
	const getHighlightedText = (text: string, highlight: string) => {
		// Split on highlight term and include term into parts, ignore case
        if(highlight) {
            const parts = text.toLowerCase().split(new RegExp(`(${highlight.toLowerCase()})`, 'gi'));
            return <span> { parts.map((part, i) => 
                part.trim().length === part.length && parts.length !== 1 ?
                <a href='#' key={i} className='step-keywords'>
                    { part }
                </a> : part)
            } </span>; 
        }
        return <span>{text}</span>	
	}
	
    if(isLoading) return <h3>Loading...</h3>

    if(!recipe) return <h3>Recipe not found</h3>

    return (
        <>
            {   recipe &&
                <div className='container pt-2 pt-md-5'>
                    <div className='recipe-hero w-100 h-100'>
                        <div className='d-md-flex flex-col flex-md-row-reverse justify-content-md-between'>
                            <img className='hero-bg col-md-5 h-100' src={recipe?.image} />
                            <div className='recipe-hero-content col-md-6 d-flex flex-column justify-content-center align-items-left h-100 pt-2'>
                                <h1>{recipe?.title}</h1>
                                <div className='hero-icon-container'>
                                    <span className='m-0'><FontAwesomeIcon role='button' icon={faHeart} style={{color: "#fda085"}} className='hero-save px-2'/>Save</span>
                                    <span><FontAwesomeIcon role='button' icon={faComment} style={{color: "#fda085"}} className='hero-review px-2'/>Write a Review</span>
                                </div>
                                <div className='recipe-heading'>
                                    <FontAwesomeIcon icon={faClock} /><span className='px-2'>Time: { recipe?.readyInMinutes } minutes</span>
                                    <FontAwesomeIcon icon={faStar} /><span className='px-2'>Difficulty Level: Hard</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='recipe-details py-2'>
                        <div className='details-header col-md-6 justify-content-between'>
                            <h2>Ingredients</h2>
                            <span className='d-flex justify-content-between'>
                                <span className='px-4'>Servings: { servings }</span>
                                <div className="btn-group btn-group-sm btn-servings" role="group" aria-label="Small button group">
                                    <button type="button" className="btn btn-secondary" onClick={reduceServings}>-</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setServings(servings + 1)}>+</button>
                                </div>
                            </span>
                        </div>
                        <div className='details-content d-md-flex justify-content-md-between w-100'>
                            <div className='col-12 col-md-6'>
                                <ul className='px-0'>
                                    {
                                        recipe?.extendedIngredients && recipe.extendedIngredients.map((ingredient, index) =>
                                            <li className='ingredient-item d-flex justify-content-between' key={index}>
                                                <span className='ingredient-name'>{ ingredient.name }</span>
                                                {/* <span>{ (ingredient.measures.metric.amount * servings).toFixed(0) } { ingredient.measures.metric.unitShort }</span> */}
                                            </li>
                                    )}
                                </ul>
                            </div>
                            <div className='col-12 col-md-5'>
                                <div className='recipe-detail-nutrition p-3'>
                                    <h4>Nutrition</h4>
                                    <div className='row row-cols-2 g-3'>
                                        <div className="col"><FontAwesomeIcon icon={faFire} /><span>Calories</span></div>
                                        <div className="col"><FontAwesomeIcon icon={faEgg} /><span>Protein</span></div>
                                        <div className="col"><FontAwesomeIcon icon={faBowlRice} /><span>CarbonDioxide</span></div>
                                        <div className="col"><FontAwesomeIcon icon={faDroplet} /><span>Fat</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>

                    <div className='recipe-details py-2'>
                        <div className='details-header col-md-6 justify-content-between'>
                            <h2>Steps</h2>
                        </div>
                        <div className='details-content'>
                            {
                                recipe.instructions.map((instruction, index) => 
                                    <div key={index}>
                                        {
                                            instruction.name && <div className='instruction-header'>{instruction.name}</div>
                                        }
                                        <div className='instruction-container'>
                                            {
                                                instruction.steps.map((step) => 
                                                    <div className='step-container' key={step.stepNumber}>
                                                        <span className='step-header'>Step {step.stepNumber}</span>
                                                        <div className='step-text'>
                                                            {
                                                                getHighlightedText(step.description, [...ingredientList].join('|'))
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                            }
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

export default RecipeDetails; 