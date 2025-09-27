export interface equipment {
    "id": number,
    "image": string,
    "name": string,
    "temperature"?: {
        "number": number,
        "unit": string
    }
}