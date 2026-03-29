import { ArrowRight, Bot, ChefHat, MessageSquareText, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './chatbot.scss';

const starterPrompts = [
    'Build me a high-protein dinner plan for 3 days',
    'What can I cook with chicken, garlic, and rice?',
    'Turn my saved recipes into a quick grocery list'
];

const Chatbot = () => {
    return (
        <div className="container-fluid py-4 chatbot-page animate-fade-in">
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
                            <div className="chatbot-composer">
                                <MessageSquareText size={18} />
                                <span>Future chat input area</span>
                                <ArrowRight size={16} />
                            </div>
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
                                <button key={prompt} type="button" className="chatbot-prompt-chip">
                                    <Sparkles size={16} />
                                    <span>{prompt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
