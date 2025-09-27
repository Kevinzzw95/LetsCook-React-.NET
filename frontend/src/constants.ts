import { Refinements } from "./types/refinements"

const TYPES = [
    'main course',
    'side dish',
    'dessert',
    'appetizer',
    'salad',
    'bread',
    'breakfast',
    'soup',
    'beverage',
    'sauce',
    'marinade',
    'fingerfood',
    'snack',
    'drink'
]

const CUISINES = [
    'African',
    'Asian',
    'American',
    'British',
    'Cajun',
    'Caribbean',
    'Chinese',
    'Eastern European',
    'European',
    'French'
]

const DIETS = [
    'Vegan',
    'Vegetarian',
    'Low Fodmap',
    'Ketogenic',
    'Gluten Free',
    'Dairy Free'
]

export const CATEGORIES = [
    {
        "name": 'type',
        "values": TYPES
    },
    {
        "name": 'cuisine',
        "values": CUISINES
    },
    {
        "name": 'diet',
        "values": DIETS
    }
]

export const REFINEMENTS: Refinements = {
    "type": TYPES,
    "cuisine": CUISINES,
    "diet": DIETS
}

export const TimeArray = (max: number) => {
    const array = [];
    for (let i = 0; i <= max; i++) {
        array.push(i.toString().padStart(2, '0'));
    }
    return array;
}