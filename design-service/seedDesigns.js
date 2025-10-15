const mongoose = require('mongoose');
require('dotenv').config();

const Design = require('./models/design');

// Sample design data
const sampleDesigns = [
  {
    name: "Elegant Evening Gown",
    category: "formal",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=600&fit=crop",
    description: "A stunning floor-length evening gown perfect for formal events and galas. Features intricate beading and a flattering silhouette.",
    price: 450,
    difficulty: "advanced",
    estimatedTime: 8,
    tags: ["elegant", "beaded", "floor-length", "formal"],
    sizeCriteria: ["bust", "waist", "hips", "length"]
  },
  {
    name: "Classic Business Suit",
    category: "office",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop",
    description: "Professional business suit with clean lines and perfect tailoring. Ideal for corporate environments and important meetings.",
    price: 320,
    difficulty: "intermediate",
    estimatedTime: 6,
    tags: ["professional", "tailored", "business", "suit"],
    sizeCriteria: ["chest", "waist", "shoulder", "sleeve", "length"]
  },
  {
    name: "Casual Summer Dress",
    category: "casual",
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&h=600&fit=crop",
    description: "Light and breezy summer dress perfect for warm weather. Comfortable and stylish for everyday wear.",
    price: 85,
    difficulty: "beginner",
    estimatedTime: 3,
    tags: ["summer", "casual", "light", "comfortable"],
    sizeCriteria: ["bust", "waist", "length"]
  },
  {
    name: "Traditional Saree",
    category: "traditional",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Beautiful traditional saree with intricate embroidery and rich fabric. Perfect for cultural events and celebrations.",
    price: 280,
    difficulty: "intermediate",
    estimatedTime: 5,
    tags: ["traditional", "embroidery", "cultural", "elegant"],
    sizeCriteria: ["blouse_bust", "blouse_waist", "saree_length"]
  },
  {
    name: "Wedding Party Dress",
    category: "wedding",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Gorgeous party dress for wedding celebrations. Features beautiful detailing and a flattering cut.",
    price: 380,
    difficulty: "advanced",
    estimatedTime: 7,
    tags: ["wedding", "party", "celebration", "detailed"],
    sizeCriteria: ["bust", "waist", "hips", "length", "shoulder"]
  },
  {
    name: "Western Denim Jacket",
    category: "western",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=600&fit=crop",
    description: "Trendy denim jacket with modern cuts and contemporary styling. Perfect for casual outings and street style.",
    price: 120,
    difficulty: "beginner",
    estimatedTime: 4,
    tags: ["denim", "casual", "trendy", "western"],
    sizeCriteria: ["chest", "shoulder", "sleeve", "length"]
  },
  {
    name: "Ethnic Kurta Set",
    category: "ethnic",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Traditional ethnic kurta set with matching bottoms. Comfortable and stylish for cultural occasions.",
    price: 150,
    difficulty: "intermediate",
    estimatedTime: 4,
    tags: ["ethnic", "traditional", "kurta", "cultural"],
    sizeCriteria: ["chest", "waist", "length", "sleeve"]
  },
  {
    name: "Cocktail Party Dress",
    category: "party",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Chic cocktail dress perfect for evening parties and social gatherings. Features modern design and elegant styling.",
    price: 220,
    difficulty: "intermediate",
    estimatedTime: 5,
    tags: ["cocktail", "party", "evening", "chic"],
    sizeCriteria: ["bust", "waist", "hips", "length"]
  },
  {
    name: "Office Blazer",
    category: "office",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Professional blazer with clean lines and perfect fit. Essential for business wardrobe and formal meetings.",
    price: 180,
    difficulty: "intermediate",
    estimatedTime: 5,
    tags: ["professional", "blazer", "business", "formal"],
    sizeCriteria: ["chest", "shoulder", "sleeve", "length"]
  },
  {
    name: "Casual T-Shirt",
    category: "casual",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Comfortable and stylish casual t-shirt perfect for everyday wear. Made with quality fabric for durability.",
    price: 45,
    difficulty: "beginner",
    estimatedTime: 2,
    tags: ["casual", "comfortable", "everyday", "basic"],
    sizeCriteria: ["chest", "length", "sleeve"]
  },
  {
    name: "Formal Trousers",
    category: "formal",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Well-tailored formal trousers perfect for business and formal occasions. Features excellent fit and quality fabric.",
    price: 95,
    difficulty: "intermediate",
    estimatedTime: 4,
    tags: ["formal", "trousers", "business", "tailored"],
    sizeCriteria: ["waist", "hip", "length", "inseam"]
  },
  {
    name: "Traditional Lehenga",
    category: "traditional",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Beautiful traditional lehenga with intricate work and rich colors. Perfect for weddings and cultural celebrations.",
    price: 450,
    difficulty: "advanced",
    estimatedTime: 10,
    tags: ["traditional", "lehenga", "wedding", "intricate"],
    sizeCriteria: ["bust", "waist", "hips", "length", "blouse_bust", "blouse_waist"]
  },
  {
    name: "Summer Shorts",
    category: "casual",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Comfortable summer shorts perfect for warm weather. Lightweight and breathable fabric.",
    price: 35,
    difficulty: "beginner",
    estimatedTime: 2,
    tags: ["summer", "shorts", "casual", "comfortable"],
    sizeCriteria: ["waist", "hip", "length"]
  },
  {
    name: "Evening Blouse",
    category: "formal",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Elegant evening blouse with sophisticated design. Perfect for formal dinners and special occasions.",
    price: 160,
    difficulty: "intermediate",
    estimatedTime: 4,
    tags: ["evening", "formal", "elegant", "sophisticated"],
    sizeCriteria: ["bust", "waist", "shoulder", "sleeve"]
  },
  {
    name: "Party Jumpsuit",
    category: "party",
    image: "https://images.unsplash.com/photo-1594736797933-d0c0a0a0a0a0?w=500&h=600&fit=crop",
    description: "Trendy party jumpsuit perfect for social gatherings. Features modern design and comfortable fit.",
    price: 140,
    difficulty: "intermediate",
    estimatedTime: 5,
    tags: ["party", "jumpsuit", "trendy", "modern"],
    sizeCriteria: ["bust", "waist", "hips", "length", "inseam"]
  }
];

// Connect to MongoDB and seed data
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting design seeding process...');
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing designs
    await Design.deleteMany({});
    console.log('🗑️  Cleared existing designs');
    
    // Insert sample designs
    const createdDesigns = await Design.insertMany(sampleDesigns);
    console.log(`✅ Successfully seeded ${createdDesigns.length} designs`);
    
    // Display summary
    const categories = [...new Set(createdDesigns.map(design => design.category))];
    console.log('\n📊 Seeding Summary:');
    console.log(`   Total designs: ${createdDesigns.length}`);
    console.log(`   Categories: ${categories.join(', ')}`);
    console.log(`   Difficulty levels: ${[...new Set(createdDesigns.map(d => d.difficulty))].join(', ')}`);
    
    console.log('\n🎉 Design seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding designs:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { sampleDesigns, seedDatabase };
