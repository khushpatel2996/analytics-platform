from datetime import datetime
from typing import Optional, Tuple

def validate_date_string(date_str: Optional[str]) -> Optional[str]:
    """Validate that date_str is in YYYY-MM-DD format."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Invalid date format '{date_str}'. Expected 'YYYY-MM-DD'.")

def validate_date_range(date_from: Optional[str], date_to: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Validate date range order."""
    d_from = validate_date_string(date_from)
    d_to = validate_date_string(date_to)
    if d_from and d_to and d_from > d_to:
        raise ValueError(f"date_from ({d_from}) cannot be after date_to ({d_to}).")
    return d_from, d_to
