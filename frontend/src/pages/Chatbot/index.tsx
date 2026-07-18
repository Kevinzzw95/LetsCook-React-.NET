import { useEffect, useState } from 'react';
import { Bot, ChefHat, MessageSquareText, Send, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useChatMutation } from '../../redux/api/aiApiSlice';
import './chatbot.scss';

const starterPrompts = [
    'Build me a high-protein dinner plan for 3 days',
    'What can I cook with chicken, garlic, and rice?',
    'Turn my saved recipes into a quick grocery list'
];

type ChatMessage = {
    role: 'user' | 'bot';
    text: string;
};

const Chatbot = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chat, { isLoading: isChatLoading }] = useChatMutation();
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            role: 'bot',
            text: 'Hi, I am Chef Bot. Ask me for meal ideas, substitutions, or help turning ingredients into dinner.'
        }
    ]);

    const openChatRoom = () => setIsChatOpen(true);
    const closeChatRoom = () => setIsChatOpen(false);

    useEffect(() => {
        document.body.classList.toggle('modal-open', isChatOpen);

        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isChatOpen]);

    const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedMessage = chatInput.trim();
        if (!trimmedMessage) return;

        const nextMessages: ChatMessage[] = [
            ...chatMessages,
            { role: 'user', text: trimmedMessage }
        ];

        setChatMessages(nextMessages);
        setChatInput('');

        try {
            const response = await chat({
                message: trimmedMessage,
                history: chatMessages.map(message => ({
                    role: message.role === 'bot' ? 'assistant' : 'user',
                    content: message.text
                }))
            }).unwrap();

            setChatMessages(currentMessages => [
                ...currentMessages,
                { role: 'bot', text: response.reply }
            ]);
        } catch {
            setChatMessages(currentMessages => [
                ...currentMessages,
                {
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
                            {chatMessages.map((message, index) => (
                                <div
                                    key={`${message.role}-${index}`}
                                    className={`chatbot-room-message chatbot-room-message-${message.role}`}
                                >
                                    {message.text}
                                </div>
                            ))}
                        </div>

                        <form className="chatbot-room-composer" onSubmit={sendMessage}>
                            <label className="visually-hidden" htmlFor="chatbot-room-input">
                                Message Chef Bot
                            </label>
                            <input
                                id="chatbot-room-input"
                                type="text"
                                value={chatInput}
                                onChange={(event) => setChatInput(event.target.value)}
                                placeholder="Ask what to cook next"
                            />
                            <button type="submit" aria-label="Send message" disabled={isChatLoading}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
