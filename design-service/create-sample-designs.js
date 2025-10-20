const axios = require('axios');

const BASE_URL = 'http://localhost:3006/api';

// Sample designs with different measurement requirements
const sampleDesigns = [
  {
    name: 'Classic Men\'s Shirt',
    description: 'A timeless button-down shirt perfect for formal and casual occasions',
    category: 'Men',
    images: [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjNEY0NkU1Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NZW4ncyBTaGlydDwvdGV4dD4KPC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjNEY0NkU1Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NZW4ncyBTaGlydCAyPC90ZXh0Pgo8L3N2Zz4='
    ],
    requiredMeasurements: [
      'neck', 'shoulder_width', 'chest', 'armhole', 'bicep', 
      'wrist', 'sleeve_length', 'waist', 'height'
    ],
    price: 120,
    difficulty: 'intermediate',
    estimatedTime: 6,
    tags: ['formal', 'business', 'classic'],
    sizeCriteria: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    name: 'Elegant Women\'s Dress',
    description: 'A sophisticated dress suitable for evening events and special occasions',
    category: 'Women',
    images: [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRUM0ODk5Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Xb21lbidzIERyZXNzPC90ZXh0Pgo8L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRUM0ODk5Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Xb21lbidzIERyZXNzIDI8L3RleHQ+Cjwvc3ZnPg=='
    ],
    requiredMeasurements: [
      'chest', 'upper_bust', 'under_bust', 'waist', 'hip', 
      'shoulder_width', 'sleeve_length', 'dress_length', 'height'
    ],
    price: 200,
    difficulty: 'advanced',
    estimatedTime: 12,
    tags: ['elegant', 'evening', 'formal'],
    sizeCriteria: ['XS', 'S', 'M', 'L', 'XL']
  },
  {
    name: 'Casual Unisex T-Shirt',
    description: 'A comfortable and versatile t-shirt for everyday wear',
    category: 'Unisex',
    images: [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMTBCOTgxIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ULVNoaXJ0PC90ZXh0Pgo8L3N2Zz4=',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMTBCOTgxIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ULVNoaXJ0IDI8L3RleHQ+Cjwvc3ZnPg=='
    ],
    requiredMeasurements: [
      'chest', 'shoulder_width', 'sleeve_length', 'height'
    ],
    price: 50,
    difficulty: 'beginner',
    estimatedTime: 3,
    tags: ['casual', 'comfortable', 'everyday'],
    sizeCriteria: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  },
  {
    name: 'Professional Women\'s Blazer',
    description: 'A tailored blazer perfect for business and professional settings',
    category: 'Women',
    images: [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjN0MzQUVEIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CbGF6ZXI8L3RleHQ+Cjwvc3ZnPg==',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjN0MzQUVEIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CbGF6ZXIgMjwvdGV4dD4KPC9zdmc+'
    ],
    requiredMeasurements: [
      'chest', 'waist', 'shoulder_width', 'armhole', 'bicep',
      'sleeve_length', 'back_length', 'height'
    ],
    price: 180,
    difficulty: 'advanced',
    estimatedTime: 10,
    tags: ['professional', 'business', 'tailored'],
    sizeCriteria: ['XS', 'S', 'M', 'L', 'XL']
  },
  {
    name: 'Men\'s Formal Trousers',
    description: 'Classic dress pants for formal and business occasions',
    category: 'Men',
    images: [
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjU5RTBCIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Ucm91c2VyczwvdGV4dD4KPC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjU5RTBCIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Ucm91c2VycyAyPC90ZXh0Pgo8L3N2Zz4='
    ],
    requiredMeasurements: [
      'waist', 'hip', 'thigh', 'knee', 'calf', 'ankle',
      'inseam', 'outseam', 'crotch_depth', 'height'
    ],
    price: 100,
    difficulty: 'intermediate',
    estimatedTime: 5,
    tags: ['formal', 'business', 'classic'],
    sizeCriteria: ['28', '30', '32', '34', '36', '38', '40']
  }
];

async function createSampleDesigns() {
  console.log('🎨 Creating Sample Designs with Measurement Requirements...\n');

  try {
    // First, let's check available measurements
    console.log('📏 Available measurements:');
    const measurementsResponse = await axios.get(`${BASE_URL}/measurements`);
    console.log(`Found ${measurementsResponse.data.count} global measurements\n`);

    // Create each sample design
    for (let i = 0; i < sampleDesigns.length; i++) {
      const design = sampleDesigns[i];
      console.log(`Creating design ${i + 1}/${sampleDesigns.length}: ${design.name}`);
      
      try {
        const response = await axios.post(`${BASE_URL}/designs`, design);
        console.log(`✅ Created: ${response.data.data.name}`);
        console.log(`   Category: ${response.data.data.category}`);
        console.log(`   Required Measurements: ${response.data.data.measurementDetails.length}`);
        console.log(`   Measurement Details:`);
        response.data.data.measurementDetails.forEach(measurement => {
          console.log(`     - ${measurement.label} (${measurement.category})`);
        });
        console.log('');
      } catch (error) {
        console.log(`❌ Failed to create ${design.name}: ${error.response?.data?.message || error.message}`);
      }
    }

    // Display all created designs
    console.log('📋 All Designs Summary:');
    const allDesignsResponse = await axios.get(`${BASE_URL}/designs`);
    console.log(`Total designs: ${allDesignsResponse.data.count}`);
    
    allDesignsResponse.data.data.forEach(design => {
      console.log(`- ${design.name} (${design.category}): ${design.measurementDetails.length} measurements`);
    });

    console.log('\n🎉 Sample designs created successfully!');
    console.log('\n💡 You can now test the frontend integration by:');
    console.log('   1. Fetching a design by ID to get its measurement requirements');
    console.log('   2. Using the measurement details to generate dynamic forms');
    console.log('   3. Validating user measurements against the design requirements');

  } catch (error) {
    console.error('❌ Error creating sample designs:', error.response?.data || error.message);
  }
}

// Run the script
createSampleDesigns();
