import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export type AiChatMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export type AiChatRequest = {
    message: string;
    history: AiChatMessage[];
};

export type AiChatResponse = {
    reply: string;
};

const baseQuery = fetchBaseQuery({
    baseUrl: "http://localhost:8088/",
})

export const aiApiSlice = createApi({
    reducerPath: 'aiApi',
    baseQuery: baseQuery,
    endpoints: builder => ({
        chat: builder.mutation<AiChatResponse, AiChatRequest>({
            query: body => ({
                url: 'chat',
                method: 'POST',
                body
            })
        })
    })
})

export const { useChatMutation } = aiApiSlice;

export default aiApiSlice.reducer; 
