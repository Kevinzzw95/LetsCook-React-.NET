using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Entity
{
    public class ShoppingItem
    {
        public long Id { get; set; }
        public Ingredient Ingredient { get; set; }
        public string Amount { get; set; }
        public string Unit { get; set; }
        public string Store { get; set; }
        public bool IsBought { get; set; }
        public ShoppingList ShoppingList { get; set; }
        public int ShoppingListId { get; set; }
    }
}