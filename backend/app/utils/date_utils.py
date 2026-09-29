import pandas as pd
from typing import Optional, Tuple
from datetime import datetime

def parse_dates_robust(series: pd.Series) -> pd.Series:
    """
    Robustly parses date series handling various common formats.
    """
    return pd.to_datetime(series, errors='coerce')

def get_date_bounds(series: pd.Series) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (min_date_str, max_date_str) in YYYY-MM-DD format.
    """
    dt_series = pd.to_datetime(series, errors='coerce').dropna()
    if dt_series.empty:
        return None, None
    return dt_series.min().strftime('%Y-%m-%d'), dt_series.max().strftime('%Y-%m-%d')

def add_date_features(df: pd.DataFrame, date_column: str) -> pd.DataFrame:
    """
    Appends date dimension columns: year, month, month_name, quarter, day,
    day_of_week, day_name, week, is_weekend, year_month.
    """
    if date_column not in df.columns:
        return df

    dates = pd.to_datetime(df[date_column], errors='coerce')
    df = df.copy()
    df['year'] = dates.dt.year
    df['month'] = dates.dt.month
    df['month_name'] = dates.dt.strftime('%b')
    df['quarter'] = dates.dt.quarter
    df['quarter_name'] = 'Q' + dates.dt.quarter.astype(str)
    df['day'] = dates.dt.day
    df['day_of_week'] = dates.dt.dayofweek # 0=Monday, 6=Sunday
    df['day_name'] = dates.dt.strftime('%A')
    # Week calculation compatible with newer pandas
    df['week'] = dates.dt.isocalendar().week
    df['is_weekend'] = dates.dt.dayofweek.isin([5, 6]).astype(int)
    df['year_month'] = dates.dt.strftime('%Y-%m')
    df['date_only'] = dates.dt.strftime('%Y-%m-%d')
    return df
