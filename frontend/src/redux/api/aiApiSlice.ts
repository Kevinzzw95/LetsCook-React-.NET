import { AI_API_BASE_URL } from '../../config/environment';
import { createApi } from '@reduxjs/toolkit/query/react';
import { apiSlice } from './apiSlice';
import { createBaseQueryWithReauth } from './baseQueryWithReauth';

export type AiStoredChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
};

export type AiChatRequest = {
    conversationId: string;
    message: string;
    timezone?: string;
};

export type MealPlanSaveResult = {
    status: 'saved' | 'unchanged' | 'failed' | 'not_saved';
    entries: Array<{ id: string; planned_date: string; meal_type: string; recipe_id: string; recipe_title: string; status: 'saved' | 'existing' }>;
    unfilled_slots: Array<{ planned_date: string; meal_type: string }>;
    reason?: string | null;
    unverified_requirements?: string[];
};

export type AiChatResponse = {
    meal_plan_save_result?: MealPlanSaveResult | null;
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

export const aiApiSlice = createApi({
    reducerPath: 'aiApi',
    baseQuery: createBaseQueryWithReauth(AI_API_BASE_URL),
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
            query: ({ conversationId, message, timezone }) => ({
                url: `conversations/${conversationId}/messages`,
                method: 'POST',
                body: { message, timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone }
            }),
            async onQueryStarted(_request, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.meal_plan_save_result?.status === 'saved' || data.meal_plan_save_result?.status === 'unchanged') {
                        dispatch(apiSlice.util.invalidateTags(['MealPlan']));
                    }
                } catch {
                    // A failed chat request has no confirmed calendar mutation.
                }
            }
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
