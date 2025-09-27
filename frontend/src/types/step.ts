import { equipment } from "./equipment";

export interface step {
    "equipment"?: equipment[],
    "ingredients"?: {
        "id": number,
        "image": string,
        "name": string
    }[],
    "stepNumber": number,
    "description": string,
    "length"?: {
        "number": number,
        "unit": string
    },
}