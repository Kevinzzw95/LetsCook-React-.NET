import { step } from "./step";

export interface instruction {
    "name": string,
    "steps": step[]
}