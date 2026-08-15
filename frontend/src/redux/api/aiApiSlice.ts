import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store/store';

export type AiStoredChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
};

export type AiChatRequest = {
    conversationId: string;
    message: string;
};

export type AiChatResponse = {
    reply: string;
    user_message: AiStoredChatMessage;
    assistant_message: AiStoredChatMessage;
};

export type AiConversation = {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
};

export type AiConversationMessages = {
    conversation_id: string;
    messages: AiStoredChatMessage[];
};

const baseQuery = fetchBaseQuery({
    baseUrl: "http://localhost:8088/",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.token;
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        return headers;
    }
})

export const aiApiSlice = createApi({
    reducerPath: 'aiApi',
    baseQuery: baseQuery,
    endpoints: builder => ({
        createConversation: builder.mutation<AiConversation, void>({
            query: () => ({
                url: 'conversations',
                method: 'POST'
            })
        }),
        getConversationMessages: builder.query<AiConversationMessages, string>({
            query: conversationId => `conversations/${conversationId}/messages`
        }),
        chat: builder.mutation<AiChatResponse, AiChatRequest>({
            query: ({ conversationId, message }) => ({
                url: `conversations/${conversationId}/messages`,
                method: 'POST',
                body: { message }
            })
        }),
        deleteConversation: builder.mutation<void, string>({
            query: conversationId => ({
                url: `conversations/${conversationId}`,
                method: 'DELETE'
            })
        })
    })
})

export const {
    useChatMutation,
    useCreateConversationMutation,
    useDeleteConversationMutation,
    useLazyGetConversationMessagesQuery
} = aiApiSlice;

export default aiApiSlice.reducer; 
