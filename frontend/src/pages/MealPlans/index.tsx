import { useEffect, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Plus, ShoppingCart, Soup, Trash2, Users } from 'lucide-react';
import { MealPlanEntry, MealPlanRecipeOption, MealType } from '../../types/mealPlan';
import { useAddMealPlanDaysToShoppingListMutation, useAddRecipeIngredientsToShoppingListMutation, useDeleteMealPlanEntryMutation, useGetMealPlanEntriesQuery, useGetRecipesQuery, useUpsertMealPlanEntryMutation } from '../../redux/recipe/recipeApiSlice';
import './meal-plans.scss';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatMonthLabel = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const formatWeekdayLabel = (date: Date) =>
    date.toLocaleDateString(undefined, { weekday: 'short' });

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toUtcIso = (dateKey: string) => `${dateKey}T00:00:00.000Z`;

const getCalendarDays = (month: Date) => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = start.getDay();
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - startOffset);

    return Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        return date;
    });
};

const MealPlans = () => {
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
    const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');
    const [selectedRecipeId, setSelectedRecipeId] = useState<number | ''>('');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [bulkAddMessage, setBulkAddMessage] = useState<string | null>(null);

    const { data: entries = [], isLoading: isLoadingEntries } = useGetMealPlanEntriesQuery({
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1
    });
    const { data: recipes = [], isLoading: isLoadingRecipes } = useGetRecipesQuery();
    const [upsertMealPlanEntry, { isLoading: isSaving }] = useUpsertMealPlanEntryMutation();
    const [deleteMealPlanEntry, { isLoading: isDeleting }] = useDeleteMealPlanEntryMutation();
    const [addMealPlanDaysToShoppingList, { isLoading: isAddingToShoppingList }] = useAddMealPlanDaysToShoppingListMutation();
    const [addRecipeIngredientsToShoppingList, { isLoading: isAddingRecipeIngredients }] = useAddRecipeIngredientsToShoppingListMutation();

    useEffect(() => {
        const today = new Date();
        if (today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth()) {
            setSelectedDate(formatDateKey(today));
            return;
        }

        setSelectedDate(formatDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)));
    }, [currentMonth]);

    const calendarDays = getCalendarDays(currentMonth);
    const entriesBySlot = new Map<string, MealPlanEntry[]>();

    entries.forEach(entry => {
        const key = `${entry.plannedDate.slice(0, 10)}-${entry.mealType}`;
        const existingEntries = entriesBySlot.get(key);

        if (existingEntries) {
            existingEntries.push(entry);
            return;
        }

        entriesBySlot.set(key, [entry]);
    });

    const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    const selectedEntriesByMealType = mealTypes.map(mealType => ({
        mealType,
        entries: entriesBySlot.get(`${selectedDate}-${mealType}`) ?? []
    }));

    const plannedCount = entries.length;
    const recipesForPicker = recipes as MealPlanRecipeOption[];
    const selectedDayCount = selectedDays.length;

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedRecipeId) return;

        await upsertMealPlanEntry({
            plannedDate: toUtcIso(selectedDate),
            mealType: selectedMealType,
            recipeId: Number(selectedRecipeId)
        }).unwrap();
        setSelectedRecipeId('');
    };

    const toggleDaySelection = (dateKey: string) => {
        setBulkAddMessage(null);
        setSelectedDays(currentSelectedDays =>
            currentSelectedDays.includes(dateKey)
                ? currentSelectedDays.filter(day => day !== dateKey)
                : [...currentSelectedDays, dateKey]
        );
    };

    const addSelectedDaysToShoppingList = async () => {
        if (selectedDays.length === 0) return;

        const result = await addMealPlanDaysToShoppingList({
            plannedDates: selectedDays.map(toUtcIso)
        }).unwrap();

        setBulkAddMessage(
            result.addedItemsCount > 0
                ? `Added ${result.addedItemsCount} ingredient item${result.addedItemsCount > 1 ? 's' : ''} from ${result.selectedDaysCount} day${result.selectedDaysCount > 1 ? 's' : ''}.`
                : 'No ingredients were added for the selected days.'
        );
        setSelectedDays([]);
    };

    const addPlannedRecipeToShoppingList = async (recipeId: number, recipeTitle: string) => {
        const result = await addRecipeIngredientsToShoppingList(recipeId).unwrap();

        setBulkAddMessage(
            result.addedItemsCount > 0
                ? `Added ${result.addedItemsCount} ingredient item${result.addedItemsCount > 1 ? 's' : ''} from ${recipeTitle}.`
                : `No ingredients were added from ${recipeTitle}.`
        );
    };

    const changeMonth = (direction: -1 | 1) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    return (
        <div className="container-fluid py-4 meal-plans-page animate-fade-in">
            <div className="card-glass meal-plans-hero p-3 p-lg-4 mb-2 mb-lg-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between gap-2 gap-lg-4">
                    <div>
                        <div className="d-inline-flex align-items-center gap-2 meal-plans-pill mb-2 mb-lg-3">
                            <CalendarDays size={18} />
                            Meal Plans
                        </div>
                    </div>
                    <div className="meal-plans-summary">
                        <div className="summary-card">
                            <span className="summary-value">{plannedCount}</span>
                            <span className="summary-label">Meals scheduled this month</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-value">{recipesForPicker.length}</span>
                            <span className="summary-label">Recipes available to plan</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-value">{selectedDayCount}</span>
                            <span className="summary-label">Days selected for shopping list</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-2 g-lg-4 align-items-start">
                <div className="col-xl-8">
                    <div className="card-glass p-3 p-lg-4">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-2 mb-lg-4">
                            <div>
                                <h2 className="h4 fw-bold mb-1">{formatMonthLabel(currentMonth)}</h2>
                                <p className="text-secondary mb-0">Breakfast, lunch, and dinner slots for every day.</p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <button type="button" className="btn btn-outline-sunny rounded-circle month-nav-btn" onClick={() => changeMonth(-1)}>
                                    <ChevronLeft size={18} />
                                </button>
                                <button type="button" className="btn btn-sunny rounded-pill px-3" onClick={() => setCurrentMonth(new Date())}>
                                    This Month
                                </button>
                                <button type="button" className="btn btn-outline-sunny rounded-circle month-nav-btn" onClick={() => changeMonth(1)}>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="calendar-weekdays mb-2">
                            {weekdayLabels.map(label => (
                                <div key={label} className="calendar-weekday">{label}</div>
                            ))}
                        </div>

                        <div className="calendar-grid">
                            {calendarDays.map(day => {
                                const dateKey = formatDateKey(day);
                                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                const isSelected = dateKey === selectedDate;

                                return (
                                    <button
                                        type="button"
                                        key={dateKey}
                                        className={`calendar-day ${isCurrentMonth ? '' : 'calendar-day-muted'} ${isSelected ? 'calendar-day-selected' : ''} ${selectedDays.includes(dateKey) ? 'calendar-day-picked' : ''}`}
                                        onClick={() => setSelectedDate(dateKey)}
                                    >
                                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                            <div className="calendar-day-weekday mb-0">{formatWeekdayLabel(day)}</div>
                                            <button
                                                type="button"
                                                className={`calendar-select-btn ${selectedDays.includes(dateKey) ? 'calendar-select-btn-active' : ''}`}
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    toggleDaySelection(dateKey);
                                                }}
                                            >
                                                <Check size={14} />
                                            </button>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="calendar-date-number">{day.getDate()}</span>
                                            <span className="calendar-slot-count">
                                                {mealTypes.reduce((count, mealType) => count + (entriesBySlot.get(`${dateKey}-${mealType}`)?.length ?? 0), 0)}
                                            </span>
                                        </div>
                                        {/* <div className="calendar-slot-list">
                                            {mealTypes.map(mealType => {
                                                const slotEntries = entriesBySlot.get(`${dateKey}-${mealType}`) ?? [];
                                                return (
                                                    <div key={mealType} className={`calendar-slot-preview ${slotEntries.length > 0 ? 'calendar-slot-filled' : ''}`}>
                                                        <span className="text-capitalize">{mealType}</span>
                                                        <strong>{slotEntries.length > 0 ? `${slotEntries.length} recipe${slotEntries.length > 1 ? 's' : ''}` : 'Open'}</strong>
                                                    </div>
                                                );
                                            })}
                                        </div> */}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="col-xl-4">
                    <div className="card-glass p-4 planner-sidebar">
                        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                        <div className="d-flex align-items-center gap-2">
                            <div className="icon-circle bg-orange-light text-orange rounded-circle">
                                <Soup size={20} />
                            </div>
                            <div>
                                <h2 className="h5 fw-bold mb-0">Plan for {selectedDateLabel}</h2>
                                <p className="text-secondary mb-0">Stack multiple recipes in each meal slot.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bulk-shopping-card mb-4">
                        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                            <div>
                                <h3 className="h6 fw-bold mb-1">Shopping list from selected days</h3>
                                <p className="text-secondary mb-0">Select calendar days, then add every planned recipe ingredient in one action.</p>
                            </div>
                            <div className="bulk-shopping-count">{selectedDayCount}</div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-sunny rounded-pill fw-semibold w-100"
                            onClick={addSelectedDaysToShoppingList}
                            disabled={selectedDayCount === 0 || isAddingToShoppingList}
                        >
                            <ShoppingCart size={18} className="me-2" />
                            {isAddingToShoppingList ? 'Adding ingredients...' : 'Add selected days to shopping list'}
                        </button>
                        {bulkAddMessage && (
                            <p className="bulk-shopping-message mb-0 mt-3">{bulkAddMessage}</p>
                        )}
                    </div>

                    <form onSubmit={handleSave} className="d-flex flex-column gap-3 mb-4">
                        <div>
                            <label className="form-label fw-semibold">Meal slot</label>
                            <div className="meal-type-toggle">
                                {mealTypes.map(mealType => (
                                    <button
                                        type="button"
                                        key={mealType}
                                        className={`btn rounded-pill text-capitalize ${selectedMealType === mealType ? 'btn-sunny' : 'btn-outline-sunny'}`}
                                        onClick={() => setSelectedMealType(mealType)}
                                    >
                                        {mealType}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="recipeId" className="form-label fw-semibold">Recipe</label>
                            <select
                                id="recipeId"
                                className="form-select"
                                value={selectedRecipeId}
                                onChange={event => setSelectedRecipeId(event.target.value ? Number(event.target.value) : '')}
                                disabled={isLoadingRecipes}
                            >
                                <option value="">Choose a recipe</option>
                                {recipesForPicker.map(recipe => (
                                    <option key={recipe.id} value={recipe.id}>
                                        {recipe.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="btn btn-sunny rounded-pill fw-semibold" disabled={!selectedRecipeId || isSaving}>
                            <Plus size={18} className="me-2" />
                            {isSaving ? 'Saving...' : 'Save to calendar'}
                        </button>
                    </form>

                    <div className="d-flex flex-column gap-3">
                        {isLoadingEntries ? (
                            <div className="text-secondary">Loading meal plan...</div>
                        ) : selectedEntriesByMealType.every(group => group.entries.length === 0) ? (
                            <div className="empty-day-state">
                                <CalendarDays size={28} />
                                <p className="mb-0">No meals scheduled for this day yet.</p>
                            </div>
                        ) : (
                            selectedEntriesByMealType.map(group => (
                                <section key={group.mealType} className="meal-slot-section">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h3 className="h6 fw-bold text-capitalize mb-0">{group.mealType}</h3>
                                        <span className="meal-slot-badge">{group.entries.length} planned</span>
                                    </div>
                                    {group.entries.length === 0 ? (
                                        <div className="empty-slot-state">No recipes added yet.</div>
                                    ) : (
                                        <div className="d-flex flex-column gap-3">
                                            {group.entries.map(entry => (
                                                <article key={entry.id} className="planned-meal-card">
                                                    {entry.recipeImageUrl ? (
                                                        <img src={entry.recipeImageUrl} alt={entry.recipeTitle} className="planned-meal-image" />
                                                    ) : (
                                                        <div className="planned-meal-image planned-meal-placeholder">
                                                            <Soup size={20} />
                                                        </div>
                                                    )}
                                                    <div className="planned-meal-body">
                                                        <div className="d-flex justify-content-between align-items-start gap-2">
                                                            <div>
                                                                <span className="planned-meal-type text-capitalize">{entry.mealType}</span>
                                                                <h3 className="h6 fw-bold mb-1">{entry.recipeTitle}</h3>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-link text-danger p-0"
                                                                onClick={() => deleteMealPlanEntry(entry.id)}
                                                                disabled={isDeleting}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                        <div className="planned-meal-meta">
                                                            <span><Clock3 size={14} /> {entry.cookingMinutes} min</span>
                                                            <span><Users size={14} /> {entry.servings} servings</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-sunny rounded-pill fw-semibold planned-meal-action"
                                                            onClick={() => addPlannedRecipeToShoppingList(entry.recipeId, entry.recipeTitle)}
                                                            disabled={isAddingRecipeIngredients}
                                                        >
                                                            <ShoppingCart size={16} className="me-2" />
                                                            {isAddingRecipeIngredients ? 'Adding ingredients...' : 'Add ingredients'}
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            ))
                        )}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MealPlans;
