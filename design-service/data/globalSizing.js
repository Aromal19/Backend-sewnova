// Global sizing reference data for garment design
// This provides comprehensive sizing options for different garment types

const globalSizing = [
  // --- Standard Sizes ---
  { "id": "XS", "label": "Extra Small", "category": "standard", "gender": "unisex" },
  { "id": "S", "label": "Small", "category": "standard", "gender": "unisex" },
  { "id": "M", "label": "Medium", "category": "standard", "gender": "unisex" },
  { "id": "L", "label": "Large", "category": "standard", "gender": "unisex" },
  { "id": "XL", "label": "Extra Large", "category": "standard", "gender": "unisex" },
  { "id": "XXL", "label": "Double Extra Large", "category": "standard", "gender": "unisex" },
  { "id": "XXXL", "label": "Triple Extra Large", "category": "standard", "gender": "unisex" },

  // --- Numeric Sizes (Men's) ---
  { "id": "28", "label": "Size 28", "category": "numeric", "gender": "men" },
  { "id": "30", "label": "Size 30", "category": "numeric", "gender": "men" },
  { "id": "32", "label": "Size 32", "category": "numeric", "gender": "men" },
  { "id": "34", "label": "Size 34", "category": "numeric", "gender": "men" },
  { "id": "36", "label": "Size 36", "category": "numeric", "gender": "men" },
  { "id": "38", "label": "Size 38", "category": "numeric", "gender": "men" },
  { "id": "40", "label": "Size 40", "category": "numeric", "gender": "men" },
  { "id": "42", "label": "Size 42", "category": "numeric", "gender": "men" },
  { "id": "44", "label": "Size 44", "category": "numeric", "gender": "men" },
  { "id": "46", "label": "Size 46", "category": "numeric", "gender": "men" },
  { "id": "48", "label": "Size 48", "category": "numeric", "gender": "men" },

  // --- Numeric Sizes (Women's) ---
  { "id": "0", "label": "Size 0", "category": "numeric", "gender": "women" },
  { "id": "2", "label": "Size 2", "category": "numeric", "gender": "women" },
  { "id": "4", "label": "Size 4", "category": "numeric", "gender": "women" },
  { "id": "6", "label": "Size 6", "category": "numeric", "gender": "women" },
  { "id": "8", "label": "Size 8", "category": "numeric", "gender": "women" },
  { "id": "10", "label": "Size 10", "category": "numeric", "gender": "women" },
  { "id": "12", "label": "Size 12", "category": "numeric", "gender": "women" },
  { "id": "14", "label": "Size 14", "category": "numeric", "gender": "women" },
  { "id": "16", "label": "Size 16", "category": "numeric", "gender": "women" },
  { "id": "18", "label": "Size 18", "category": "numeric", "gender": "women" },
  { "id": "20", "label": "Size 20", "category": "numeric", "gender": "women" },

  // --- Plus Sizes ---
  { "id": "1X", "label": "1X (Plus)", "category": "plus", "gender": "unisex" },
  { "id": "2X", "label": "2X (Plus)", "category": "plus", "gender": "unisex" },
  { "id": "3X", "label": "3X (Plus)", "category": "plus", "gender": "unisex" },
  { "id": "4X", "label": "4X (Plus)", "category": "plus", "gender": "unisex" },

  // --- Petite Sizes ---
  { "id": "PXS", "label": "Petite XS", "category": "petite", "gender": "women" },
  { "id": "PS", "label": "Petite Small", "category": "petite", "gender": "women" },
  { "id": "PM", "label": "Petite Medium", "category": "petite", "gender": "women" },
  { "id": "PL", "label": "Petite Large", "category": "petite", "gender": "women" },
  { "id": "PXL", "label": "Petite XL", "category": "petite", "gender": "women" },

  // --- Tall Sizes ---
  { "id": "TXS", "label": "Tall XS", "category": "tall", "gender": "unisex" },
  { "id": "TS", "label": "Tall Small", "category": "tall", "gender": "unisex" },
  { "id": "TM", "label": "Tall Medium", "category": "tall", "gender": "unisex" },
  { "id": "TL", "label": "Tall Large", "category": "tall", "gender": "unisex" },
  { "id": "TXL", "label": "Tall XL", "category": "tall", "gender": "unisex" },

  // --- Custom/Measurement-based ---
  { "id": "CUSTOM", "label": "Custom Size", "category": "custom", "gender": "unisex" },
  { "id": "MADE_TO_MEASURE", "label": "Made to Measure", "category": "custom", "gender": "unisex" }
];

// Helper functions for working with global sizing
const getSizingById = (id) => {
  return globalSizing.find(sizing => sizing.id === id);
};

const getSizingByCategory = (category) => {
  return globalSizing.filter(sizing => sizing.category === category);
};

const getSizingByGender = (gender) => {
  return globalSizing.filter(sizing => sizing.gender === gender || sizing.gender === 'unisex');
};

const getAllCategories = () => {
  return [...new Set(globalSizing.map(sizing => sizing.category))];
};

const getAllGenders = () => {
  return [...new Set(globalSizing.map(sizing => sizing.gender))];
};

const validateSizingIds = (sizingIds) => {
  const validIds = globalSizing.map(s => s.id);
  const invalidIds = sizingIds.filter(id => !validIds.includes(id));
  return {
    isValid: invalidIds.length === 0,
    invalidIds
  };
};

// Get sizing options based on design category
const getSizingForDesignCategory = (designCategory) => {
  switch (designCategory.toLowerCase()) {
    case 'men':
      return globalSizing.filter(sizing => 
        sizing.gender === 'men' || sizing.gender === 'unisex'
      );
    case 'women':
      return globalSizing.filter(sizing => 
        sizing.gender === 'women' || sizing.gender === 'unisex'
      );
    case 'unisex':
      return globalSizing.filter(sizing => 
        sizing.gender === 'unisex'
      );
    default:
      return globalSizing;
  }
};

module.exports = {
  globalSizing,
  getSizingById,
  getSizingByCategory,
  getSizingByGender,
  getAllCategories,
  getAllGenders,
  validateSizingIds,
  getSizingForDesignCategory
};
