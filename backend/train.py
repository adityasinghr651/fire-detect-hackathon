import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

def train_model():
    print("Starting model training...")

    # 1. Load the dataset from a free online source
    # This is the famous UCI Forest Fires dataset
    data_url = "https://archive.ics.uci.edu/ml/machine-learning-databases/forest-fires/forestfires.csv"
    try:
        df = pd.read_csv(data_url)
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        print("Please check your internet connection.")
        return

    # 2. Define our Features (X) and Target (y)
    # For our MVP, we only use the features our user provides:
    # 'temp': Temperature in C
    # 'RH': Relative Humidity in %
    # 'wind': Wind speed in km/h
    features = ['temp', 'RH', 'wind']
    
    # Our target is whether a fire occurred or not.
    # The 'area' column is > 0 if there was a fire.
    df['fire_occurred'] = (df['area'] > 0).astype(int)

    X = df[features]
    y = df['fire_occurred']

    # 3. Split data (optional but good practice)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Create and Train the AI model
    # A Random Forest is great for this kind of problem.
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    print("Model training complete.")
    
    # 5. Test accuracy (just for us to see)
    accuracy = model.score(X_test, y_test)
    print(f"Model Accuracy: {accuracy * 100:.2f}%")

    # 6. Save the trained model to a file
    model_filename = 'fire_model.joblib'
    joblib.dump(model, model_filename)
    print(f"Model saved as '{model_filename}'")


if __name__ == "__main__":
    train_model()