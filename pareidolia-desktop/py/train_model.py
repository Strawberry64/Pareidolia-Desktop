"""
Created by Aleaxngelo Orozco Gutierrez on 2-10-2026

Currently is supposed to use file paths to get image training data and export a working model
However, until a virtual envoirment is made with the nseecery packages, it currently returns an error.
Future work will allow the python function to execute successfully and allow flexible model creation options
"""
import sys
import os
import numpy as np
import cv2
from tensorflow import keras
from tensorflow.keras import layers, models

# Model constants
IMG_HEIGHT = 224
IMG_WIDTH = 224
IMG_CHANNELS = 3
# THIS WILL NEED CHANGING depending on how many labels the user will want to make, so it will not always remain 2 as it appears now
NUM_CLASSES = 2  # Binary classification: thing present or not present
LEARNING_RATE = 0.001

def create_cnn_model():
    """Creates a CNN model for gesture classification."""
    # Simpler, more stable model without in-model augmentation
    model = models.Sequential([
        # First Conv Block
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=(IMG_HEIGHT, IMG_WIDTH, IMG_CHANNELS)),
        layers.MaxPooling2D((2, 2)),
        
        # Second Conv Block
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        
        # Third Conv Block
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        
        # Dense layers
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(NUM_CLASSES, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def load_images_from_folders(positives_path, negatives_path):
    """Load images from separate positive and negative folders."""
    images = []
    labels = []
    
    # Load negative images (label 0)
    if os.path.exists(negatives_path):
        for img_file in os.listdir(negatives_path):
            if img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                img_path = os.path.join(negatives_path, img_file)
                
                img = cv2.imread(img_path)
                if img is None:
                    continue
                    
                img = cv2.resize(img, (IMG_WIDTH, IMG_HEIGHT))
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                images.append(img)
                labels.append(0)  # Negative class
    
    # Load positive images (label 1)
    if os.path.exists(positives_path):
        for img_file in os.listdir(positives_path):
            if img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                img_path = os.path.join(positives_path, img_file)
                
                img = cv2.imread(img_path)
                if img is None:
                    continue
                    
                img = cv2.resize(img, (IMG_WIDTH, IMG_HEIGHT))
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                images.append(img)
                labels.append(1)  # Positive class
    
    if len(images) == 0:
        return None, None
    
    images = np.array(images, dtype='float32') / 255.0
    labels = keras.utils.to_categorical(labels, NUM_CLASSES)
    
    return images, labels

def preprocess_frame(frame):
    """Preprocess a frame for prediction."""
    img = cv2.resize(frame, (IMG_WIDTH, IMG_HEIGHT))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype('float32') / 255.0
    img = np.expand_dims(img, axis=0)
    return img

# start of program, takes four arguments: positives_path, negatives_path, model_path, and epochs
# in the future, multiple paths will be nesecery. a list of paths may be the implementation later on.
# functions are declared above and used here
if __name__ == "__main__":
    # Check for required arguments
    if len(sys.argv) < 5:
        print("Error: Missing required arguments")
        print("Usage: python train_model.py <positives_path> <negatives_path> <model_path> <epochs>")
        sys.exit(1)
    
    # Get command line arguments
    positives_path = sys.argv[1]
    negatives_path = sys.argv[2]
    model_path = sys.argv[3]
    epochs = int(sys.argv[4])
    
    print(f"Loading positive images from: {positives_path}")
    print(f"Loading negative images from: {negatives_path}")
    print(f"Model will be saved to: {model_path}")
    print(f"Training for {epochs} epochs")
    
    # Load and prepare images
    X_train, y_train = load_images_from_folders(positives_path, negatives_path)
    
    if X_train is None or len(X_train) == 0:
        print("Error: No images found or failed to load images")
        sys.exit(1)
    
    print(f"Loaded {len(X_train)} images")
    
    # Create the model
    model = create_cnn_model()
    print("Model created successfully")
    
    # Train the model
    print(f"Starting training for {epochs} epochs...")
    history = model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=32,
        validation_split=0.2,
        verbose=1
    )
    
    # Get final metrics
    final_loss = history.history['loss'][-1]
    final_accuracy = history.history['accuracy'][-1]
    final_val_loss = history.history['val_loss'][-1]
    final_val_accuracy = history.history['val_accuracy'][-1]
    
    # Save the model
    model.save(model_path)
    print(f"Model saved to: {model_path}")
    
    # Print final metrics in a format easy to parse for the UI
    print(f"FINAL_LOSS:{final_loss}")
    print(f"FINAL_ACCURACY:{final_accuracy}")
    print(f"FINAL_VAL_LOSS:{final_val_loss}")
    print(f"FINAL_VAL_ACCURACY:{final_val_accuracy}")

