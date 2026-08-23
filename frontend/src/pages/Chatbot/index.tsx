import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Bot, ChefHat, LoaderCircle, MessageSquareText, Send, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { AiRecipePreview, AiStoredChatMessage } from '../../redux/api/aiApiSlice';
import {
    useChatMutation,
    useCreateConversationMutation,
    useLazyGetConversationMessagesQuery
} from '../../redux/api/aiApiSlice';
import { selectCurrentUser } from '../../redux/auth/authSlice';
import RecipePreview from '../../components/RecipeEditor/Preview';
import './chatbot.scss';

const starterPrompts = [
    'Build me a high-protein dinner plan for 3 days',
    'What can I cook with chicken, garlic, and rice?',
    'Turn my saved recipes into a quick grocery list'
];

type ChatMessage = {
    id: string;
    role: 'user' | 'bot';
    text: string;
    recipePreview?: AiRecipePreview;
};

const greeting: ChatMessage = {
    id: 'chef-bot-greeting',
    role: 'bot',
    text: 'Hi, I am Chef Bot. Ask me for meal ideas, substitutions, or help turning ingredients into dinner.'
};

const toChatMessage = (message: AiStoredChatMessage, recipePreview?: AiRecipePreview | null): ChatMessage => ({
    id: message.id,
    role: message.role === 'assistant' ? 'bot' : 'user',
    text: message.content,
    ...(recipePreview ? { recipePreview } : {})
});

const Chatbot = () => {
    const currentUser = useSelector(selectCurrentUser);
    const storageKey = useMemo(() => `letscook:chef-bot:conversation:${currentUser ?? 'user'}`, [currentUser]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [historyReload, setHistoryReload] = useState(0);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [chat, { isLoading: isChatLoading }] = useChatMutation();
    const [createConversation, { isLoading: isConversationCreating }] = useCreateConversationMutation();
    const [getConversationMessages] = useLazyGetConversationMessagesQuery();
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([greeting]);
    const [recipePreview, setRecipePreview] = useState<AiRecipePreview | null>(null);
    const [isRecipePreviewOpen, setIsRecipePreviewOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const previewCloseRef = useRef<HTMLButtonElement>(null);

    const openChatRoom = () => setIsChatOpen(true);
    const closeChatRoom = () => {
        setIsRecipePreviewOpen(false);
        setRecipePreview(null);
        setIsChatOpen(false);
    };
    const closeRecipePreview = () => {
        setIsRecipePreviewOpen(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    const openRecipePreview = (preview: AiRecipePreview) => {
        setRecipePreview(preview);
        setIsRecipePreviewOpen(true);
    };

    useEffect(() => {
        if (isRecipePreviewOpen) previewCloseRef.current?.focus();
    }, [isRecipePreviewOpen]);

    useEffect(() => {
        document.body.classList.toggle('modal-open', isChatOpen);

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isRecipePreviewOpen) {
                closeRecipePreview();
            } else {
                closeChatRoom();
            }
        };
        if (isChatOpen) document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.body.classList.remove('modal-open');
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isChatOpen, isRecipePreviewOpen]);

    useEffect(() => {
        if (!isChatOpen) return;

        let cancelled = false;

        const loadHistory = async () => {
            setHistoryError(null);
            setIsHistoryLoading(true);

            try {
                let activeConversationId = sessionStorage.getItem(storageKey);

                if (!activeConversationId) {
                    const conversation = await createConversation().unwrap();
                    activeConversationId = conversation.id;
                    sessionStorage.setItem(storageKey, activeConversationId);
                }

                try {
                    const history = await getConversationMessages(activeConversationId, true).unwrap();
                    if (!cancelled) {
                        setConversationId(activeConversationId);
                        setChatMessages(
                            history.messages.length > 0
                                ? history.messages.map(message => toChatMessage(message))
                                : [greeting]
                        );
                    }
                } catch (error) {
                    const status = typeof error === 'object' && error !== null && 'status' in error
                        ? error.status
                        : undefined;
                    if (status !== 404) throw error;

                    sessionStorage.removeItem(storageKey);
                    const conversation = await createConversation().unwrap();
                    sessionStorage.setItem(storageKey, conversation.id);
                    if (!cancelled) {
                        setConversationId(conversation.id);
                        setChatMessages([greeting]);
                    }
                }

                if (!cancelled) window.setTimeout(() => inputRef.current?.focus(), 0);
            } catch {
                if (!cancelled) {
                    setHistoryError('Your chat history could not be loaded. Check the AI API and try again.');
                }
            } finally {
                if (!cancelled) setIsHistoryLoading(false);
            }
        };

        void loadHistory();
        return () => {
            cancelled = true;
        };
    }, [createConversation, getConversationMessages, historyReload, isChatOpen, storageKey]);

    useEffect(() => {
        if (!isChatOpen) return;
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    }, [chatMessages, isChatLoading, isChatOpen]);

    const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedMessage = chatInput.trim();
        if (!trimmedMessage || !conversationId) return;

        const optimisticMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            text: trimmedMessage
        };

        setChatMessages(currentMessages => [...currentMessages, optimisticMessage]);
        setChatInput('');

        try {
            const response = await chat({
                conversationId,
                message: trimmedMessage
            }).unwrap();

            setChatMessages(currentMessages => [
                ...currentMessages.map(message => (
                    message.id === optimisticMessage.id ? toChatMessage(response.user_message) : message
                )),
                toChatMessage(response.assistant_message, response.recipe_preview)
            ]);
        } catch {
            setChatMessages(currentMessages => [
                ...currentMessages,
                {
                    id: crypto.randomUUID(),
                    role: 'bot',
                    text: 'I could not reach Chef Bot right now. Please check the AI API server and OpenAI configuration.'
                }
            ]);
        }
    };

    return (
        <div className={`container-fluid py-4 chatbot-page animate-fade-in ${isChatOpen ? 'chat-open' : ''}`}>
            <div className="card-glass chatbot-hero p-3 p-lg-4 mb-3 mb-lg-4">
                <div className="row g-4 align-items-center">
                    <div className="col-lg-7">
                        <div className="chatbot-pill mb-3">
                            <Sparkles size={16} />
                            AI Kitchen Assistant
                        </div>
                        <h1 className="chatbot-title mb-3">Cook smarter with a recipe copilot built into Yummy.</h1>
                        <p className="chatbot-copy mb-4">
                            Ask for meal ideas, ingredient substitutions, prep shortcuts, or help deciding what to cook
                            next. This page is ready for the future chatbot flow and already gives users a clear entry point.
                        </p>
                        <div className="chatbot-actions d-flex flex-wrap gap-2">
                            <Link to="/recipe-list/" className="btn btn-sunny rounded-pill px-4 py-2">
                                Explore Recipes
                            </Link>
                            <Link to="/new-recipe/" className="btn btn-outline-sunny rounded-pill px-4 py-2">
                                Create a Recipe
                            </Link>
                        </div>
                    </div>
                    <div className="col-lg-5">
                        <div className="chatbot-preview">
                            <div className="chatbot-preview-header">
                                <div className="chatbot-preview-badge">
                                    <Bot size={18} />
                                    Chef Bot
                                </div>
                                <span>Beta</span>
                            </div>
                            <div className="chatbot-message chatbot-message-user">
                                What can I make with salmon, lemon, and asparagus tonight?
                            </div>
                            <div className="chatbot-message chatbot-message-bot">
                                Try a sheet-pan salmon dinner with roasted asparagus and lemon garlic potatoes. I can also
                                turn that into a full recipe draft next.
                            </div>
                            <button
                                type="button"
                                className="btn btn-sunny chatbot-start-button"
                                onClick={openChatRoom}
                            >
                                <MessageSquareText size={18} />
                                Start chatting
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 g-lg-4">
                <div className="col-lg-4">
                    <div className="card-glass chatbot-feature-card p-3 p-lg-4 h-100">
                        <div className="chatbot-feature-icon">
                            <ChefHat size={22} />
                        </div>
                        <h2 className="h5 fw-bold mb-2">Prompt-ready cooking help</h2>
                        <p className="text-secondary mb-0">
                            Great for fast “what should I cook?” moments, ingredient substitutions, and meal prep ideas.
                        </p>
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card-glass chatbot-prompts p-3 p-lg-4">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                            <div>
                                <div className="chatbot-section-kicker">Starter prompts</div>
                                <h2 className="h4 fw-bold mb-0">Use these ideas when the chatbot is connected.</h2>
                            </div>
                        </div>

                        <div className="chatbot-prompt-list">
                            {starterPrompts.map((prompt) => (
                                <button key={prompt} type="button" className="chatbot-prompt-chip" onClick={() => {
                                    setChatInput(prompt);
                                    openChatRoom();
                                }}>
                                    <Sparkles size={16} />
                                    <span>{prompt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isChatOpen && (
                <div className="chatbot-room-modal" role="dialog" aria-modal="true" aria-labelledby="chatbot-room-title">
                    <div className="chatbot-room-backdrop" onClick={closeChatRoom}></div>
                    <div className="chatbot-room-panel">
                        <div className="chatbot-room-header">
                            <div className="chatbot-preview-badge">
                                <Bot size={20} />
                                <div>
                                    <h2 id="chatbot-room-title" className="chatbot-room-title">Chef Bot</h2>
                                    <span>Kitchen assistant</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="chatbot-room-close"
                                onClick={closeChatRoom}
                                aria-label="Close chat room"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="chatbot-room-messages">
                            {isHistoryLoading ? (
                                <div className="chatbot-room-status" role="status">
                                    <LoaderCircle className="chatbot-spinner" size={20} />
                                    Loading your recent conversation…
                                </div>
                            ) : null}
                            {historyError ? (
                                <div className="chatbot-room-error" role="alert">
                                    <span>{historyError}</span>
                                    <button type="button" onClick={() => setHistoryReload(value => value + 1)}>
                                        Try again
                                    </button>
                                </div>
                            ) : null}
                            {!isHistoryLoading && !historyError ? chatMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`chatbot-room-message chatbot-room-message-${message.role}`}
                                >
                                    <div>{message.text}</div>
                                    {message.role === 'bot' && message.recipePreview ? (
                                        <button
                                            type="button"
                                            className="chatbot-recipe-preview-trigger"
                                            onClick={() => {
                                                if (message.recipePreview) openRecipePreview(message.recipePreview);
                                            }}
                                            aria-label={`Show recipe preview for ${message.recipePreview.title}`}
                                        >
                                            <BookOpen size={18} />
                                            Show recipe preview
                                        </button>
                                    ) : null}
                                </div>
                            )) : null}
                            {isChatLoading ? (
                                <div className="chatbot-room-message chatbot-room-message-bot chatbot-room-thinking" role="status">
                                    <LoaderCircle className="chatbot-spinner" size={18} />
                                    Chef Bot is thinking…
                                </div>
                            ) : null}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chatbot-room-composer" onSubmit={sendMessage}>
                            <label className="visually-hidden" htmlFor="chatbot-room-input">
                                Message Chef Bot
                            </label>
                            <input
                                id="chatbot-room-input"
                                ref={inputRef}
                                type="text"
                                value={chatInput}
                                onChange={(event) => setChatInput(event.target.value)}
                                placeholder="Ask what to cook next"
                                disabled={isHistoryLoading || isConversationCreating || Boolean(historyError)}
                            />
                            <button
                                type="submit"
                                aria-label="Send message"
                                disabled={isChatLoading || isHistoryLoading || isConversationCreating || !conversationId}
                            >
                                {isChatLoading ? <LoaderCircle className="chatbot-spinner" size={18} /> : <Send size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isChatOpen && isRecipePreviewOpen && recipePreview ? (
                <div
                    className="chatbot-recipe-preview-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="chatbot-recipe-preview-title"
                >
                    <button
                        type="button"
                        className="chatbot-recipe-preview-backdrop"
                        onClick={closeRecipePreview}
                        aria-label="Close recipe preview"
                    />
                    <section className="chatbot-recipe-preview-panel">
                        <header className="chatbot-recipe-preview-header">
                            <div>
                                <span>Recipe preview</span>
                                <h2 id="chatbot-recipe-preview-title">{recipePreview.title}</h2>
                            </div>
                            <button
                                type="button"
                                ref={previewCloseRef}
                                onClick={closeRecipePreview}
                                aria-label="Close recipe preview"
                            >
                                <X size={20} />
                            </button>
                        </header>
                        <div className="chatbot-recipe-preview-content">
                            <RecipePreview {...recipePreview} />
                        </div>
                        <footer className="chatbot-recipe-preview-footer">
                            {recipePreview.sourceUrl ? (
                                <a href={recipePreview.sourceUrl} target="_blank" rel="noreferrer">
                                    Open original source
                                </a>
                            ) : null}
                            <button type="button" onClick={closeRecipePreview}>
                                Close preview
                            </button>
                        </footer>
                    </section>
                </div>
            ) : null}
        </div>
    );
};

export default Chatbot;
