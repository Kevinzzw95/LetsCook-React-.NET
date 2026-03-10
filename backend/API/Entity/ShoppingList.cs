using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Entity
{
    public class ShoppingList
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public List<ShoppingItem> Items { get; set; } = new();
        public string ClientSecret { get; set; }

        public void AddItem(Ingredient ingredient, string amount, string unit)
        {
            /* if (Items.All(item => item.Ingredient.Id != ingredient.Id))
            {
                Items.Add(new ShoppingItem { Ingredient = ingredient, Amount = amount, Unit = unit });
            }

            var existingItem = Items.FirstOrDefault(item => item.Ingredient.Id == ingredient.Id);
            if (existingItem != null && existingItem.Unit == unit) existingItem.Amount += amount; */
            Items.Add(new ShoppingItem { Ingredient = ingredient, Amount = amount, Unit = unit });
        }

        public void RemoveItem(int ingredientId, string amount, string unit)
        {
            var item = Items.FirstOrDefault(item => item.Ingredient.Id == ingredientId);
            if (item == null) return;
            Items.Remove(item);
        }
    }
}