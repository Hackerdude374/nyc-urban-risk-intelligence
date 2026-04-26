"""
Download recent NYC motor vehicle crash records from NYC Open Data.

Dataset:
Motor Vehicle Collisions - Crashes
Dataset ID: h9gi-nx95

This script pulls a limited number of recent crash records and saves them
as a raw CSV file under data/raw/.

We keep this separate from the API because ingestion is a data engineering task,
not a request/response API task.
"""

from pathlib import Path

import pandas as pd
import requests


DATASET_ID = "h9gi-nx95"
BASE_URL = f"https://data.cityofnewyork.us/resource/{DATASET_ID}.json"

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
RAW_OUTPUT_PATH = RAW_DATA_DIR / "nyc_motor_vehicle_crashes_raw.csv"


def download_crash_data(limit: int = 5000) -> pd.DataFrame:
    """
    Download crash data from NYC Open Data using Socrata's JSON API.

    Args:
        limit: Number of records to download.

    Returns:
        A pandas DataFrame containing crash records.
    """

    params = {
        "$limit": limit,
        "$order": "crash_date DESC",
    }

    response = requests.get(BASE_URL, params=params, timeout=30)
    response.raise_for_status()

    records = response.json()
    return pd.DataFrame(records)


def save_raw_crash_data(df: pd.DataFrame) -> None:
    """
    Save raw crash data to a CSV file.

    Args:
        df: Raw crash DataFrame.
    """

    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(RAW_OUTPUT_PATH, index=False)


def main() -> None:
    """
    Main script entry point.
    """

    print("Downloading NYC crash data...")
    crash_df = download_crash_data(limit=5000)

    print(f"Downloaded {len(crash_df)} crash records.")
    print(f"Columns found: {list(crash_df.columns)}")

    save_raw_crash_data(crash_df)

    print(f"Saved raw crash data to: {RAW_OUTPUT_PATH}")


if __name__ == "__main__":
    main()