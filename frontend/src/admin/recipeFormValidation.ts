import * as yup from "yup";

export const validationSchema = yup.object({
  title: yup.string().required("Please provide a recipe title"), 
  servings: yup.number( ),
  types: yup.string(),
  cuisines: yup.string(),
  diets: yup.string(),
  preparationMinutes: yup.number().min(0),
  cookingMinutes: yup.number().min(0),
  instructionsRaw: yup.array().of(yup.string()).required().min(1),
  ingredients: yup.array().of(yup.string()).required().min(1),
  /*images: yup.array().of(yup.string())
  /*file: yup.mixed().when("pictureUrl", {
    is: (value: string) => !value,
    then: (schema) => schema.required("Please provide an image"),
    otherwise: (schema) => schema.notRequired(),
  }), */
});