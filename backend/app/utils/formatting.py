from typing import Any, Union

def clean_string(val: Any) -> str:
    """Strip whitespace, handle None/NaN, and format cleanly."""
    if val is None or str(val).lower() in ("nan", "none", "null", ""):
        return ""
    return str(val).strip()

def format_currency(val: Union[int, float], currency_symbol: str = "₹") -> str:
    """Format numeric value as Indian Rupees format."""
    if val is None:
        return f"{currency_symbol}0.00"
    return f"{currency_symbol}{val:,.2f}"

def format_percentage(val: Union[int, float], decimals: int = 1) -> str:
    """Format float (e.g. 15.42) as '15.4%'."""
    if val is None:
        return "0.0%"
    return f"{val:.{decimals}f}%"

def clean_category_name(val: Any) -> str:
    """Clean category string by replacing underscores with spaces and capitalizing."""
    s = clean_string(val)
    if not s:
        return "Uncategorized"
    return s.replace("_", " ").title()
