using System.Globalization;

namespace API.Helpers
{
    public static class AmountParser
    {
        public static decimal ConvertFractionStringToDecimal(string? rawAmount)
        {
            if (string.IsNullOrWhiteSpace(rawAmount))
            {
                return 0;
            }

            var normalized = rawAmount.Trim();
            if (decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalValue))
            {
                return decimalValue;
            }

            var segments = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 2 &&
                decimal.TryParse(segments[0], NumberStyles.Number, CultureInfo.InvariantCulture, out var whole) &&
                TryParseFraction(segments[1], out var fraction))
            {
                return whole + fraction;
            }

            if (TryParseFraction(normalized, out var value))
            {
                return value;
            }

            return 0;
        }

        private static bool TryParseFraction(string input, out decimal value)
        {
            value = 0;
            var parts = input.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2)
            {
                return false;
            }

            if (!decimal.TryParse(parts[0], NumberStyles.Number, CultureInfo.InvariantCulture, out var numerator) ||
                !decimal.TryParse(parts[1], NumberStyles.Number, CultureInfo.InvariantCulture, out var denominator) ||
                denominator == 0)
            {
                return false;
            }

            value = numerator / denominator;
            return true;
        }
    }
}
