"""
Merge Kaggle Solar + Open-Meteo Weather into ONE clean dataset.
Result: a single CSV with generation + all weather features, ready for ML.
"""
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

# ============================================================
# 1. Load Kaggle Generation Data (both plants)
# ============================================================
print("Loading Kaggle generation data...")
p1_gen = pd.read_csv(os.path.join(RAW_DIR, "kaggle", "Plant_1_Generation_Data.csv"))
p2_gen = pd.read_csv(os.path.join(RAW_DIR, "kaggle", "Plant_2_Generation_Data.csv"))

# Fix Plant 1 date format (DD-MM-YYYY HH:MM -> proper datetime)
p1_gen["DATE_TIME"] = pd.to_datetime(p1_gen["DATE_TIME"], format="mixed", dayfirst=True)
p2_gen["DATE_TIME"] = pd.to_datetime(p2_gen["DATE_TIME"], format="mixed")

gen = pd.concat([p1_gen, p2_gen], ignore_index=True)
print(f"  Generation rows: {len(gen):,}")

# ============================================================
# 2. Load Kaggle Weather Sensor Data (both plants)
# ============================================================
print("Loading Kaggle weather sensor data...")
p1_weather = pd.read_csv(os.path.join(RAW_DIR, "kaggle", "Plant_1_Weather_Sensor_Data.csv"))
p2_weather = pd.read_csv(os.path.join(RAW_DIR, "kaggle", "Plant_2_Weather_Sensor_Data.csv"))

p1_weather["DATE_TIME"] = pd.to_datetime(p1_weather["DATE_TIME"])
p2_weather["DATE_TIME"] = pd.to_datetime(p2_weather["DATE_TIME"])

weather_sensor = pd.concat([p1_weather, p2_weather], ignore_index=True)
print(f"  Weather sensor rows: {len(weather_sensor):,}")

# ============================================================
# 3. Merge generation + on-site weather sensor (same plant, same time)
# ============================================================
print("Merging generation + sensor data...")
df = pd.merge(gen, weather_sensor[["DATE_TIME", "PLANT_ID", "AMBIENT_TEMPERATURE", "MODULE_TEMPERATURE", "IRRADIATION"]],
              on=["DATE_TIME", "PLANT_ID"], how="left")
print(f"  After merge: {len(df):,} rows")

# ============================================================
# 4. Load Open-Meteo weather (hourly -> need to match to 15-min)
# ============================================================
print("Loading Open-Meteo weather data...")
meteo = pd.read_csv(os.path.join(RAW_DIR, "openmeteo_weather.csv"))
meteo["time"] = pd.to_datetime(meteo["time"])
meteo = meteo.rename(columns={"time": "DATE_TIME_HOUR"})
print(f"  Open-Meteo rows: {len(meteo)}")

# Create an hour-floor column in main df to join on
df["DATE_TIME_HOUR"] = df["DATE_TIME"].dt.floor("h")

# Merge: each 15-min row gets the weather of its hour
df = pd.merge(df, meteo, on="DATE_TIME_HOUR", how="left")
df = df.drop(columns=["DATE_TIME_HOUR"])
print(f"  After weather merge: {len(df):,} rows")

# ============================================================
# 5. Add useful engineered features
# ============================================================
print("Adding engineered features...")
df["HOUR"] = df["DATE_TIME"].dt.hour
df["DAY_OF_YEAR"] = df["DATE_TIME"].dt.dayofyear
df["MONTH"] = df["DATE_TIME"].dt.month
df["TEMP_DIFF"] = df["MODULE_TEMPERATURE"] - df["AMBIENT_TEMPERATURE"]  # heat buildup proxy

# ============================================================
# 6. Quick quality check
# ============================================================
print("\n" + "=" * 60)
print("FINAL MERGED DATASET SUMMARY")
print("=" * 60)
print(f"Shape: {df.shape[0]:,} rows x {df.shape[1]} columns")
print(f"Date range: {df['DATE_TIME'].min()} -> {df['DATE_TIME'].max()}")
print(f"Plants: {df['PLANT_ID'].nunique()}")
print(f"Inverters: {df['SOURCE_KEY'].nunique()}")
print(f"\nColumns:")
for col in df.columns:
    non_null = df[col].notna().sum()
    pct = 100 * non_null / len(df)
    if df[col].dtype in ['float64', 'int64']:
        print(f"  {col:35s} | {pct:5.1f}% filled | min={df[col].min():10.2f} | max={df[col].max():10.2f}")
    else:
        print(f"  {col:35s} | {pct:5.1f}% filled")

print(f"\nNull counts:")
nulls = df.isnull().sum()
nulls = nulls[nulls > 0]
if len(nulls) == 0:
    print("  None! Dataset is complete.")
else:
    for col, count in nulls.items():
        print(f"  {col}: {count:,} ({100*count/len(df):.1f}%)")

# ============================================================
# 7. Save
# ============================================================
os.makedirs(PROCESSED_DIR, exist_ok=True)
out_path = os.path.join(PROCESSED_DIR, "solar_panel_dataset.csv")
df.to_csv(out_path, index=False)
size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f"\nSaved to: {out_path}")
print(f"File size: {size_mb:.1f} MB")
print("\nDone! You now have ONE file with everything.")
