import { object, number, string, array, ObjectSchema } from 'yup';
import { RecipeDraft } from "../../types/recipe";

export const validationSchema: ObjectSchema<RecipeDraft> = object({
	title: string().required("Please provide a recipe title"), 
	servings: number().required(),
	types: string().optional(),
	cuisines: string().optional(),
	diets: string().optional(),
	prepTime: number().min(0).optional(),
	steps: array().of(
		object({
			id: string().required(),
			stepNumber: number().required(),
			description: string().required()
		}).required(),
	).required().min(1),
    sourceName: string().optional(),
	ingredients: array().of(
		object({
			id: string().required(),
			amount: string().required(),
			name: string().required(),
			unit: string().required()
		}),
	).required().min(1),
	images: array().optional()
	/*file: yup.mixed().when("pictureUrl", {
		is: (value: string) => !value,
		then: (schema) => schema.required("Please provide an image"),
		otherwise: (schema) => schema.notRequired(),
	}), */
});