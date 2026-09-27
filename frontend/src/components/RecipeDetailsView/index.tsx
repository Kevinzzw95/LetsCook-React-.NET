import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Plus, Users, Utensils, ZoomIn } from 'lucide-react';
import type { Ingredient } from '../../types/ingredient';
import type { instruction } from '../../types/instruction';
import '../../pages/RecipeDetails/recipe-details.scss';
import ImageLightbox from './ImageLightbox';

interface RecipeDetailsViewRecipe {
    id?: string | number;
    title: string;
    imageUrls?: (File | string)[];
    servings?: number;
    preparationMinutes?: number;
    cuisine?: string;
    type?: string;
    diet?: string;
    instructions: instruction[];
    extendedIngredients: Ingredient[];
    calories?: number;
    protein?: number;
    carbohydrate?: number;
    fat?: number;
}

interface Props {
    recipe: RecipeDetailsViewRecipe;
    variant?: 'page' | 'preview';
    editRecipeHref?: string;
    onAddItemToShoppingList?: (ingredient: Ingredient) => void;
    onDeleteRecipe?: () => void;
    isDeletingRecipe?: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const RecipeDetailsView = ({
    recipe,
    variant = 'page',
    editRecipeHref,
    onAddItemToShoppingList,
    onDeleteRecipe,
    isDeletingRecipe = false
}: Props) => {
    const visibleThumbnailCount = 4;
    const galleryRef = useRef<HTMLDivElement>(null);
    const selectedIndexRef = useRef(0);
    const imageTriggerRef = useRef<HTMLButtonElement | null>(null);
    const [isImageOpen, setIsImageOpen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const imageSources = useMemo(
        () =>
            (recipe.imageUrls ?? []).map((image) => ({
                src: typeof image === 'string' ? image : URL.createObjectURL(image),
                revoke: typeof image !== 'string'
            })),
        [recipe.imageUrls]
    );

    useEffect(() => {
        return () => {
            imageSources.forEach((image) => {
                if (image.revoke) {
                    URL.revokeObjectURL(image.src);
                }
            });
        };
    }, [imageSources]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(max-width: 576px)');
        const updateViewportMode = () => setIsMobileViewport(mediaQuery.matches);

        updateViewportMode();
        mediaQuery.addEventListener('change', updateViewportMode);

        return () => mediaQuery.removeEventListener('change', updateViewportMode);
    }, []);

    useEffect(() => {
        setCurrentImageIndex(0);
        setThumbnailStartIndex(0);
        selectedIndexRef.current = 0;
        galleryRef.current?.scrollTo(0, 0);
        setIsImageOpen(false);
    }, [imageSources]);

    useEffect(() => {
        const gallery = galleryRef.current;
        if (!gallery) return;
        const observer = new ResizeObserver(() => {
            gallery.scrollLeft = selectedIndexRef.current * gallery.clientWidth;
        });
        observer.observe(gallery);
        return () => observer.disconnect();
    }, [imageSources.length]);

    const selectImage = (index: number) => {
        const nextIndex = Math.max(0, Math.min(imageSources.length - 1, index));
        selectedIndexRef.current = nextIndex;
        setCurrentImageIndex(nextIndex);
        const gallery = galleryRef.current;
        if (gallery) gallery.scrollTo({ left: nextIndex * gallery.clientWidth });
    };

    const closeImage = () => {
        setIsImageOpen(false);
        // Restore focus to the now-visible slide after navigating in the popup.
        const trigger = galleryRef.current?.querySelectorAll<HTMLButtonElement>('.recipe-image-gallery__slide')[selectedIndexRef.current];
        (trigger ?? imageTriggerRef.current)?.focus({ preventScroll: true });
    };

    useEffect(() => {
        if (isMobileViewport) {
            return;
        }

        const thumbnailEndIndex = thumbnailStartIndex + visibleThumbnailCount - 1;
        if (currentImageIndex < thumbnailStartIndex) {
            setThumbnailStartIndex(currentImageIndex);
        } else if (currentImageIndex > thumbnailEndIndex) {
            setThumbnailStartIndex(currentImageIndex - visibleThumbnailCount + 1);
        }
    }, [currentImageIndex, isMobileViewport, thumbnailStartIndex]);

    const currentImage = imageSources[currentImageIndex]?.src ?? '';
    const canSlideThumbnailsLeft = thumbnailStartIndex > 0;
    const canSlideThumbnailsRight = thumbnailStartIndex + visibleThumbnailCount < imageSources.length;
    const visibleThumbnails = isMobileViewport
        ? imageSources
        : imageSources.slice(
            thumbnailStartIndex,
            thumbnailStartIndex + visibleThumbnailCount
        );

    const ingredientNames = useMemo(
        () =>
            Array.from(
                new Set(
                    recipe.extendedIngredients
                        .map((ingredient) => ingredient.name?.trim())
                        .filter((name): name is string => Boolean(name))
                )
            ),
        [recipe.extendedIngredients]
    );

    const getHighlightedText = (text: string) => {
        if (!ingredientNames.length) return <span>{text}</span>;

        const pattern = ingredientNames.map(escapeRegExp).join('|');
        if (!pattern) return <span>{text}</span>;

        const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
        return (
            <span>
                {parts.map((part, index) => {
                    const isIngredient = ingredientNames.some(
                        (ingredient) => ingredient.toLowerCase() === part.toLowerCase()
                    );
                    return isIngredient ? (
                        <span key={`${part}-${index}`} className='step-keywords'>
                            {part}
                        </span>
                    ) : (
                        <span key={`${part}-${index}`}>{part}</span>
                    );
                })}
            </span>
        );
    };

    return (
        <>
            {isImageOpen && currentImage && (
                <ImageLightbox src={currentImage} title={recipe.title} index={currentImageIndex}
                    count={imageSources.length} onSelect={selectImage} onClose={closeImage} />
            )}
            <div className="row g-4 mb-5">
                <div className="col-lg-6">
                    <div className="position-relative rounded-4 overflow-hidden shadow-sm" style={{ aspectRatio: '4/3' }}>
                        {imageSources.length > 0 ? (
                            <>
                                <div ref={galleryRef} className="recipe-image-gallery" role="region"
                                    aria-label="Recipe photos" tabIndex={0}
                                    onScroll={(event) => {
                                        const gallery = event.currentTarget;
                                        if (!gallery.clientWidth) return;
                                        const index = Math.max(0, Math.min(imageSources.length - 1,
                                            Math.round(gallery.scrollLeft / gallery.clientWidth)));
                                        selectedIndexRef.current = index;
                                        setCurrentImageIndex(index);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                                            event.preventDefault();
                                            selectImage(currentImageIndex + (event.key === 'ArrowRight' ? 1 : -1));
                                        }
                                    }}>
                                    {imageSources.map((image, index) => (
                                        <button key={`${image.src}-${index}`} type="button"
                                            className="recipe-image-gallery__slide"
                                            tabIndex={index === currentImageIndex ? 0 : -1}
                                            aria-label={`Enlarge ${recipe.title || 'recipe'} photo ${index + 1}`}
                                            aria-haspopup="dialog"
                                            onClick={(event) => {
                                                imageTriggerRef.current = event.currentTarget;
                                                selectImage(index);
                                                setIsImageOpen(true);
                                            }}>
                                            <img src={image.src} alt={`${recipe.title} — photo ${index + 1}`}
                                                className="main-image" draggable={false} loading={index === 0 ? 'eager' : 'lazy'} />
                                        </button>
                                    ))}
                                </div>
                                <span className="recipe-image-gallery__hint" aria-hidden="true"><ZoomIn size={16} /> Click to enlarge</span>
                                {imageSources.length > 1 && (
                                    <div className="recipe-image-gallery__navigation">
                                        <button type="button" aria-label="Previous recipe image" disabled={currentImageIndex === 0}
                                            onClick={() => selectImage(currentImageIndex - 1)}><ChevronLeft size={22} /></button>
                                        <button type="button" aria-label="Next recipe image" disabled={currentImageIndex === imageSources.length - 1}
                                            onClick={() => selectImage(currentImageIndex + 1)}><ChevronRight size={22} /></button>
                                    </div>
                                )}
                                <div
                                    className="image-samll position-absolute bottom-0 start-0 w-100 p-3 bg-gradient-dark text-white"
                                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
                                >
                                    <div className={`image-samll__carousel ${isMobileViewport ? 'image-samll__carousel--scroll' : ''}`}>
                                        {!isMobileViewport && (
                                            <button
                                                type="button"
                                                className="image-samll__arrow"
                                                onClick={() => setThumbnailStartIndex((current) => Math.max(0, current - 1))}
                                                disabled={!canSlideThumbnailsLeft}
                                                aria-label="Show previous thumbnails"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                        )}

                                        <div className={`image-samll__track ${isMobileViewport ? 'image-samll__track--scroll' : ''}`}>
                                            {visibleThumbnails.map((image, index) => {
                                                const actualIndex = isMobileViewport ? index : thumbnailStartIndex + index;
                                                return (
                                                    <button
                                                        key={`${image.src}-${actualIndex}`}
                                                        type="button"
                                                        className={`image-samll__thumbnail ${actualIndex === currentImageIndex ? 'image-samll__thumbnail--active' : ''}`}
                                                        onClick={() => selectImage(actualIndex)}
                                                        aria-label={`Show recipe photo ${actualIndex + 1}`}
                                                        aria-current={actualIndex === currentImageIndex ? "true" : undefined}
                                                    >
                                                        <img
                                                            src={image.src}
                                                            className="w-100 h-100 object-fit-cover"
                                                            alt={`Thumbnail ${actualIndex + 1}`}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {!isMobileViewport && (
                                            <button
                                                type="button"
                                                className="image-samll__arrow"
                                                onClick={() =>
                                                    setThumbnailStartIndex((current) =>
                                                        Math.min(imageSources.length - visibleThumbnailCount, current + 1)
                                                    )
                                                }
                                                disabled={!canSlideThumbnailsRight}
                                                aria-label="Show next thumbnails"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="w-100 h-100 bg-secondary-subtle d-flex align-items-center justify-content-center">
                                <Utensils size={64} className="text-secondary opacity-25" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-lg-6 d-flex flex-column justify-content-center">
                    <div className="d-flex flex-wrap gap-2 mb-2">
                        <span className="badge bg-orange-light text-orange border-orange-dashed rounded-pill px-3 py-1 fw-bold">
                            {recipe.cuisine || 'Global Cuisine'}
                        </span>
                        {recipe.type && (
                            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-3 py-1 fw-bold">
                                {recipe.type}
                            </span>
                        )}
                        {recipe.diet && recipe.diet !== 'None' && (
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1 fw-bold">
                                {recipe.diet}
                            </span>
                        )}
                    </div>
                    <h1 className="display-5 fw-bold text-dark mb-3">{recipe.title || 'Untitled Recipe'}</h1>
                    {variant === 'page' && (
                        <div className="mb-3 d-flex flex-wrap gap-2">
                            {editRecipeHref && (
                                <Link to={editRecipeHref} className="btn btn-outline-sunny rounded-pill fw-medium">
                                    Edit Recipe
                                </Link>
                            )}
                            {onDeleteRecipe && (
                                <button
                                    type="button"
                                    className="btn btn-outline-danger rounded-pill fw-medium"
                                    onClick={onDeleteRecipe}
                                    disabled={isDeletingRecipe}
                                >
                                    {isDeletingRecipe ? 'Deleting...' : 'Delete Recipe'}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="d-flex flex-wrap gap-4 pt-3 border-top">
                        <div className="d-flex align-items-center gap-2">
                            <div className="icon-circle bg-light text-warning">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="m-0 text-muted small fw-bold text-uppercase">Prep Time</p>
                                <p className="m-0 fw-semibold">{recipe.preparationMinutes ?? '--'}</p>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <div className="icon-circle bg-light text-primary">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="m-0 text-muted small fw-bold text-uppercase">Servings</p>
                                <p className="m-0 fw-semibold">{recipe.servings ?? '--'} ppl</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-5">
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Calories(kcal)</p>
                        <h3 className="h4 fw-bold text-dark m-0">{recipe.calories ?? '--'}</h3>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Protein(g)</p>
                        <h3 className="h4 fw-bold text-primary m-0">{recipe.protein ?? '--'}</h3>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Carbs(g)</p>
                        <h3 className="h4 fw-bold text-warning m-0">{recipe.carbohydrate ?? '--'}</h3>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card h-100 border-0 shadow-sm bg-white p-3 text-center rounded-4">
                        <p className="text-muted small fw-bold text-uppercase mb-1">Fat(g)</p>
                        <h3 className="h4 fw-bold text-danger m-0">{recipe.fat ?? '--'}</h3>
                    </div>
                </div>
            </div>

            <div className='recipe-details row py-2'>
                <div className='col-md-5'>
                    <div className='details-header justify-content-between'>
                        <h2>Ingredients</h2>
                        <span className='d-flex justify-content-between'>
                            <span className='px-4'>Servings: {recipe.servings ?? '--'}</span>
                        </span>
                    </div>
                    <div className='details-content d-md-flex justify-content-md-between w-100'>
                        <div className='col-12'>
                            <ul className='px-0'>
                                {recipe.extendedIngredients.map((ingredient, index) => (
                                    <li className='ingredient-item d-flex justify-content-between align-items-center gap-2' key={`${ingredient.name}-${index}`}>
                                        <span className='col-4 ingredient-name'>{ingredient.name}</span>
                                        <span className='col-3 text-center'>{ingredient.amount} {String(ingredient.unit ?? '').toUpperCase()}</span>
                                        {variant === 'page' && onAddItemToShoppingList && (
                                            <button
                                                type="button"
                                                onClick={() => onAddItemToShoppingList(ingredient)}
                                                className='btn btn-sm col-auto border-0 rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm btn-sunny'
                                            >
                                                <Plus size={16} />
                                                Shopping List
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className='col-md-7'>
                    <div className='details-header justify-content-between'>
                        <h2>Steps</h2>
                    </div>
                    <div className='details-content'>
                        {recipe.instructions.map((section, index) => (
                            <div key={`${section.name || 'section'}-${index}`}>
                                {section.name && <div className='instruction-header'>{section.name}</div>}
                                <div className='instruction-container'>
                                    {section.steps.map((step) => (
                                        <div className='step-container' key={step.stepNumber}>
                                            <span className='step-header'>Step {step.stepNumber}</span>
                                            <div className='step-text'>{getHighlightedText(step.description)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export type { RecipeDetailsViewRecipe };
export default RecipeDetailsView;
