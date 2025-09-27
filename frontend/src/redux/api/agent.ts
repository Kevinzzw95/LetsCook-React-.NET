import axios, { AxiosError, AxiosResponse } from "axios";

axios.defaults.baseURL = "http://localhost:5000/api/";

const responseBody = (response: AxiosResponse) => response.data;


const requests = {
    get: (url: string) => axios.get(url).then(responseBody),
    post: (url: string, body: object) => axios.post(url, body).then(responseBody),
    put: (url: string, body: object) => axios.put(url, body).then(responseBody),
    delete: (url: string) => axios.delete(url).then(responseBody)
}

const Recipe = {
    list: () => requests.get('recipe'),
    details: (id: number) => requests.get(`recipe/${id}`),
    createRecipe: () => requests.post('recipe', {})
}

const agent = {
    Recipe 
}

export default agent;