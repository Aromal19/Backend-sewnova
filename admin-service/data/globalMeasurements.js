// Global measurements reference data
const globalMeasurements = [
  // --- Upper Body ---
  { id: "neck", label: "Neck Circumference", category: "upper_body", unit: "in/cm" },
  { id: "shoulder_width", label: "Shoulder Width", category: "upper_body", unit: "in/cm" },
  { id: "chest", label: "Chest/Bust Circumference", category: "upper_body", unit: "in/cm" },
  { id: "upper_bust", label: "Upper Bust", category: "upper_body", unit: "in/cm" },
  { id: "under_bust", label: "Under Bust", category: "upper_body", unit: "in/cm" },
  { id: "armhole", label: "Armhole Circumference", category: "upper_body", unit: "in/cm" },
  { id: "bicep", label: "Bicep Circumference", category: "upper_body", unit: "in/cm" },
  { id: "elbow", label: "Elbow Circumference", category: "upper_body", unit: "in/cm" },
  { id: "wrist", label: "Wrist Circumference", category: "upper_body", unit: "in/cm" },
  { id: "sleeve_length", label: "Sleeve Length", category: "upper_body", unit: "in/cm" },
  
  // --- Lower Body ---
  { id: "waist", label: "Waist Circumference", category: "lower_body", unit: "in/cm" },
  { id: "hip", label: "Hip Circumference", category: "lower_body", unit: "in/cm" },
  { id: "thigh", label: "Thigh Circumference", category: "lower_body", unit: "in/cm" },
  { id: "knee", label: "Knee Circumference", category: "lower_body", unit: "in/cm" },
  { id: "calf", label: "Calf Circumference", category: "lower_body", unit: "in/cm" },
  { id: "ankle", label: "Ankle Circumference", category: "lower_body", unit: "in/cm" },
  { id: "inseam", label: "Inseam Length", category: "lower_body", unit: "in/cm" },
  { id: "outseam", label: "Outseam Length", category: "lower_body", unit: "in/cm" },
  { id: "crotch_depth", label: "Crotch Depth", category: "lower_body", unit: "in/cm" },
  
  // --- Full Body ---
  { id: "height", label: "Height", category: "full_body", unit: "in/cm" },
  { id: "torso_length", label: "Torso Length", category: "full_body", unit: "in/cm" },
  { id: "shoulder_to_waist", label: "Shoulder to Waist", category: "full_body", unit: "in/cm" },
  { id: "shoulder_to_hip", label: "Shoulder to Hip", category: "full_body", unit: "in/cm" },
  { id: "back_length", label: "Back Length", category: "full_body", unit: "in/cm" },
  { id: "front_length", label: "Front Length", category: "full_body", unit: "in/cm" },
  
  // --- Optional / Dress-specific ---
  { id: "skirt_length", label: "Skirt Length", category: "dress", unit: "in/cm" },
  { id: "dress_length", label: "Dress Length", category: "dress", unit: "in/cm" },
  { id: "hem", label: "Hem Circumference", category: "dress", unit: "in/cm" },
  { id: "neck_to_waist", label: "Neck to Waist", category: "dress", unit: "in/cm" },
  { id: "waist_to_floor", label: "Waist to Floor", category: "dress", unit: "in/cm" }
];

// Get measurement by ID
const getMeasurementById = (id) => {
  return globalMeasurements.find(measurement => measurement.id === id);
};

// Get all measurements
const getAllMeasurements = () => {
  return globalMeasurements;
};

// Get measurements by category
const getMeasurementsByCategory = (category) => {
  return globalMeasurements.filter(measurement => measurement.category === category);
};

// Validate measurement IDs
const validateMeasurementIds = (measurementIds) => {
  const validIds = globalMeasurements.map(m => m.id);
  const invalidIds = measurementIds.filter(id => !validIds.includes(id));
  
  return {
    isValid: invalidIds.length === 0,
    invalidIds
  };
};

module.exports = {
  globalMeasurements,
  getMeasurementById,
  getAllMeasurements,
  getMeasurementsByCategory,
  validateMeasurementIds
};
