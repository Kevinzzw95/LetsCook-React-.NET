import { useState } from "react";
import type { ChangeEvent } from "react";
import { Globe2, Link2, Sparkles } from "lucide-react";
import "./upload-by-url-editor.scss";
import { useCreateRecipeByUrlMutation } from "../../../redux/recipe/recipeAiApiSlice";
import { useCreateRecipeMutation } from "../../../redux/recipe/recipeApiSlice";
import { useNavigate } from "react-router-dom";

const normalizeSteps = (steps: { stepNumber: number; description: string }[] = []) =>
    steps.map((step, index) => ({
        ...step,
        stepNumber: index + 1
    }));

const UploadByUrlEditor = () => {
    const navigate = useNavigate();
    const [recipeUrl, setRecipeUrl] = useState<string>("");
    const [urlError, setUrlError] = useState<string>("");
    const [createRecipeByUrl, { isLoading: isGenerating }] = useCreateRecipeByUrlMutation();
    const [createRecipe, { isLoading: isSaving }] = useCreateRecipeMutation();

    const handleUrlUpload = async () => {
        if (!recipeUrl.trim()) {
            setUrlError("Paste a recipe URL to import it.");
            return;
        }

        try {
            const res = await createRecipeByUrl(recipeUrl).unwrap();
            const savedRecipeId = await createRecipe({
                title: res.title,
                servings: res.servings,
                sourceName: "url",
                sourceUrl: recipeUrl.trim(),
                type: res.type ?? "",
                cuisine: res.cuisine ?? "",
                diet: res.diet ?? "",
                preparationMinutes: res.preparationMinutes ?? res.prepTime ?? 0,
                ingredients: res.ingredients ?? [],
                steps: normalizeSteps(res.steps),
                images: res.images ?? [],
                imageInfo: res.imageInfo ?? null
            }).unwrap();

            setUrlError("");
            navigate(`/recipe-details/${savedRecipeId}`);
        } catch (error) {
            console.error("Upload failed:", error);
            setUrlError("We could not read that recipe URL. Try another page or use images instead.");
        }
    };

    return (
        <section className="upload-by-url-editor">
            <div className="upload-by-url-editor__header">
                <span className="upload-by-url-editor__eyebrow">
                    <Sparkles size={16} />
                    Alternative Import
                </span>
                <h3>Already have a recipe link?</h3>
                <p>Paste it here and we&apos;ll build the same editable draft without uploading images.</p>
            </div>

            <div className="upload-by-url-editor__input-row">
                <div className="upload-by-url-editor__input-shell">
                    <Link2 size={18} />
                    <input
                        type="text"
                        placeholder="https://example.com/my-favorite-pasta"
                        aria-label="Enter Recipe URL"
                        value={recipeUrl}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setRecipeUrl(e.target.value);
                            setUrlError("");
                        }}
                    />
                </div>
                <button
                    className="btn btn-dark px-4 py-3"
                    type="button"
                    onClick={handleUrlUpload}
                    disabled={isGenerating || isSaving}
                >
                    {isGenerating || isSaving ? "Creating Recipe..." : "Import Recipe"}
                </button>
            </div>

            {urlError && <p className="upload-by-url-editor__error">{urlError}</p>}

            <div className="upload-by-url-editor__hint">
                <Globe2 size={16} />
                Best results come from full recipe pages with ingredients and instructions visible.
            </div>
        </section>
    );
};

export default UploadByUrlEditor;
