"""
Clean and aggregate NYC crash data for the dashboard.

This script reads the raw crash CSV downloaded by ingest_crashes.py,
cleans important fields, calculates basic borough-level risk scores,
and saves a processed JSON file for the FastAPI backend to serve.
"""

from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[3]
RAW_INPUT_PATH = PROJECT_ROOT / "data" / "raw" / "nyc_motor_vehicle_crashes_raw.csv"
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"
PROCESSED_OUTPUT_PATH = PROCESSED_DATA_DIR / "borough_risk_summary.json"


BOROUGHS = ["BROOKLYN", "QUEENS", "BRONX", "MANHATTAN", "STATEN ISLAND"]


def load_raw_crash_data() -> pd.DataFrame:
    """
    Load raw crash data from CSV.

    Returns:
        Raw crash DataFrame.

    Raises:
        FileNotFoundError: If the raw crash CSV does not exist yet.
    """

    if not RAW_INPUT_PATH.exists():
        raise FileNotFoundError(
            f"Raw crash data not found at {RAW_INPUT_PATH}. "
            "Run ingest_crashes.py first."
        )

    return pd.read_csv(RAW_INPUT_PATH)


def clean_crash_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean core fields needed for borough-level analytics.

    Args:
        df: Raw crash DataFrame.

    Returns:
        Cleaned DataFrame.
    """

    cleaned = df.copy()

    # Standardize expected columns. NYC Open Data returns lowercase API field names.
    if "borough" not in cleaned.columns:
        cleaned["borough"] = "UNKNOWN"

    if "number_of_persons_injured" not in cleaned.columns:
        cleaned["number_of_persons_injured"] = 0

    if "number_of_persons_killed" not in cleaned.columns:
        cleaned["number_of_persons_killed"] = 0

    cleaned["borough"] = (
        cleaned["borough"]
        .fillna("UNKNOWN")
        .astype(str)
        .str.upper()
        .str.strip()
    )

    cleaned["number_of_persons_injured"] = pd.to_numeric(
        cleaned["number_of_persons_injured"],
        errors="coerce",
    ).fillna(0)

    cleaned["number_of_persons_killed"] = pd.to_numeric(
        cleaned["number_of_persons_killed"],
        errors="coerce",
    ).fillna(0)

    return cleaned


def calculate_borough_risk(df: pd.DataFrame) -> dict:
    """
    Calculate simple borough-level risk scores.

    This is not ML yet. It is a transparent baseline scoring system.

    Formula:
        raw_score = crash_count + (injuries * 3) + (fatalities * 20)

    Then scores are normalized from 0 to 100.

    Args:
        df: Cleaned crash DataFrame.

    Returns:
        Dictionary ready for backend/frontend use.
    """

    filtered = df[df["borough"].isin(BOROUGHS)].copy()

    grouped = (
        filtered.groupby("borough")
        .agg(
            crash_count=("borough", "size"),
            injuries=("number_of_persons_injured", "sum"),
            fatalities=("number_of_persons_killed", "sum"),
        )
        .reset_index()
    )

    grouped["raw_score"] = (
        grouped["crash_count"]
        + grouped["injuries"] * 3
        + grouped["fatalities"] * 20
    )

    max_raw_score = grouped["raw_score"].max()

    if max_raw_score == 0:
        grouped["risk_score"] = 0
    else:
        grouped["risk_score"] = (
            grouped["raw_score"] / max_raw_score * 100
        ).round().astype(int)

    grouped = grouped.sort_values("risk_score", ascending=False)

    boroughs = []

    for _, row in grouped.iterrows():
        boroughs.append(
            {
                "name": row["borough"].title(),
                "risk_score": int(row["risk_score"]),
                "crash_count": int(row["crash_count"]),
                "injuries": int(row["injuries"]),
                "fatalities": int(row["fatalities"]),
            }
        )

    overall_risk_score = int(round(grouped["risk_score"].mean())) if len(grouped) else 0

    return {
        "city": "New York City",
        "overall_risk_score": overall_risk_score,
        "top_risk_categories": [
            "recent motor vehicle crashes",
            "injury-heavy crash clusters",
            "fatality-weighted traffic risk",
        ],
        "boroughs": boroughs,
        "source": "NYC Open Data - Motor Vehicle Collisions Crashes",
    }


def save_processed_summary(summary: dict) -> None:
    """
    Save processed borough risk summary to JSON.
    """

    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    summary_json = pd.Series(summary).to_json(indent=2)
    PROCESSED_OUTPUT_PATH.write_text(summary_json, encoding="utf-8")


def main() -> None:
    """
    Main script entry point.
    """

    print("Loading raw crash data...")
    raw_df = load_raw_crash_data()

    print(f"Loaded {len(raw_df)} raw crash records.")

    print("Cleaning crash data...")
    cleaned_df = clean_crash_data(raw_df)

    print("Calculating borough risk scores...")
    summary = calculate_borough_risk(cleaned_df)

    save_processed_summary(summary)

    print(f"Saved processed summary to: {PROCESSED_OUTPUT_PATH}")
    print(summary)


if __name__ == "__main__":
    main()