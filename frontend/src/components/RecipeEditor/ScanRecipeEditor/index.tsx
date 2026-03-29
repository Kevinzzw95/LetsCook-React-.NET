import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Camera, ImagePlus, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { RecipeDraft } from "../../../types/recipe";
import "./scan-recipe-editor.scss";
import { useUploadImagesMutation } from "../../../redux/recipe/recipeAiApiSlice";

interface Props {
    currRecipe: RecipeDraft;
    updateData: (updates: Partial<RecipeDraft>) => void;
    isModalOpen: boolean;
    setIsModalOpen: Dispatch<SetStateAction<boolean>>;
}

const ScanRecipeEditor = ({ currRecipe, updateData, setIsModalOpen }: Props) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadError, setUploadError] = useState<string>("");
    const [uploadImages, { isLoading }] = useUploadImagesMutation();

    const previewUrls = useMemo(
        () =>
            selectedFiles.map((file) => ({
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                url: URL.createObjectURL(file)
            })),
        [selectedFiles]
    );

    useEffect(() => {
        return () => {
            previewUrls.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [previewUrls]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        setSelectedFiles((currentFiles) => [...currentFiles, ...Array.from(files)]);
        setUploadError("");
        event.target.value = "";
    };

    const handleUploadImage = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        fileInputRef.current?.click();
    };

    const handleRemoveImage = (targetIndex: number) => {
        setSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== targetIndex));
        setUploadError("");
    };

    const handleAnalyzeImages = async () => {
        if (!selectedFiles.length) {
            setUploadError("Select at least one image to generate a recipe.");
            return;
        }

        try {
            const res = await uploadImages(selectedFiles).unwrap();
            updateData({
                title: res.title,
                servings: res.servings,
                sourceName: "image",
                ingredients: res.ingredients,
                steps: res.steps,
                images: selectedFiles
            });
            setUploadError("");
            setIsModalOpen(true);
        } catch (error) {
            console.error("Upload failed:", error);
            setUploadError("We could not analyze those images. Please try again with clearer food photos.");
        }
    };

    const currentImageCount = selectedFiles.length || currRecipe.images?.length || 0;

    return (
        <section className="scan-recipe-editor">
            <div className="scan-recipe-editor__hero">
                <div className="scan-recipe-editor__copy">
                    <span className="scan-recipe-editor__eyebrow">
                        <Sparkles size={16} />
                        AI Recipe Builder
                    </span>
                    <h2>Turn a few food photos into a draft recipe.</h2>
                    <p>
                        Upload plated meals, handwritten notes, or ingredient shots. We&apos;ll extract a starting
                        recipe, then you can refine the details before publishing.
                    </p>
                    <div className="scan-recipe-editor__stats">
                        <div>
                            <strong>{currentImageCount}</strong>
                            <span>images selected</span>
                        </div>
                        <div>
                            <strong>Preview first</strong>
                            <span>before upload</span>
                        </div>
                        <div>
                            <strong>Edit after</strong>
                            <span>ingredients and steps</span>
                        </div>
                    </div>
                </div>

                <div className="scan-recipe-editor__panel">
                    <button
                        className="scan-recipe-editor__dropzone"
                        type="button"
                        onClick={handleUploadImage}
                    >
                        <div className="scan-recipe-editor__dropzone-icon">
                            <UploadCloud size={30} />
                        </div>
                        <h3>Add recipe images</h3>
                        <p>Choose one or more images to preview and analyze.</p>
                        <span className="scan-recipe-editor__dropzone-action">Browse Files</span>
                    </button>

                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />

                    <div className="scan-recipe-editor__actions">
                        <button
                            type="button"
                            className="btn btn-sunny px-4 py-2"
                            onClick={handleAnalyzeImages}
                            disabled={isLoading || selectedFiles.length === 0}
                        >
                            {isLoading ? "Analyzing Images..." : "Generate Recipe Draft"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary px-4 py-2"
                            onClick={handleUploadImage}
                        >
                            Add More Images
                        </button>
                    </div>

                    {uploadError && <p className="scan-recipe-editor__error">{uploadError}</p>}
                </div>
            </div>

            <div className="scan-recipe-editor__preview-shell">
                <div className="scan-recipe-editor__preview-header">
                    <div>
                        <span className="scan-recipe-editor__section-kicker">
                            <Camera size={16} />
                            Image Preview
                        </span>
                        <h3>Review the photos before we extract the recipe.</h3>
                    </div>
                    {selectedFiles.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-link text-decoration-none"
                            onClick={() => {
                                setSelectedFiles([]);
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                }
                            }}
                        >
                            Clear Selection
                        </button>
                    )}
                </div>

                {selectedFiles.length === 0 ? (
                    <div className="scan-recipe-editor__empty">
                        <ImagePlus size={42} />
                        <p>No images selected yet.</p>
                        <span>Your thumbnails will appear here as soon as you choose files.</span>
                    </div>
                ) : (
                    <div className="scan-recipe-editor__grid">
                        {previewUrls.map((preview, index) => (
                            <article className="scan-recipe-editor__preview-card" key={`${preview.name}-${index}`}>
                                <img src={preview.url} alt={preview.name} />
                                <div className="scan-recipe-editor__preview-meta">
                                    <div>
                                        <strong>{preview.name}</strong>
                                        <span>{preview.size}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-light btn-sm"
                                        onClick={() => handleRemoveImage(index)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="background-spinner d-flex justify-content-center align-items-center">
                    <div className="scan-recipe-editor__loading-card">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h4>Reading your images</h4>
                        <p>We&apos;re building a draft recipe from the photos you selected.</p>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ScanRecipeEditor;
