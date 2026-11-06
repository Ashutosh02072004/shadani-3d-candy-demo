// Product data taken from shadanigroup.com on 6 Nov 2026 (/products/<handle>.js).
// `tagline` and `tags` are the store's own copy. `price` and `was` are in rupees.
// On the live store, refreshPrices() in main.js replaces the prices with current ones.
//
// To use a real model later, load a .glb in models.js and return it from buildCan().
export const FLAVOURS = [
  {
    id: 'orange', handle: 'orange-candy', word: 'ORANGE', short: 'Orange', name: 'Orange Candy', weight: '230g', price: 124.75, was: 138,
    tagline: 'A zesty burst of tangy citrus delight',
    tags: ['Tangy & Sweet', 'Smooth Texture', 'Perfect for Gifting'],
    style: 'raspberry', colour: '#F4860F', labelInk: '#EE8A12', icon: 'orange', tint: ['#FFF3E2', '#FFCB94'],
    image: 'https://shadanigroup.com/cdn/shop/files/Shadani_Orange_Candy_12.webp?width=500',
  },
  {
    id: 'paan', handle: 'paan-candy', word: 'PAAN', short: 'Paan', name: 'Paan Candy', weight: '230g', price: 124.75, was: 138,
    tagline: 'The essence of traditional meetha paan in every bite',
    tags: ['Betel Flavour', 'Cooling Menthol', '100% Veg'],
    style: 'raspberry', colour: '#EC8FAF', labelInk: '#17713F', icon: 'leaf', tint: ['#FDF0F4', '#F7C3D4'],
    image: 'https://shadanigroup.com/cdn/shop/files/Paan_Candy_4186a1fa-e986-47bd-a7b0-c156f2117dc8.webp?width=500',
  },
  {
    id: 'mango', handle: 'mango-candy', word: 'MANGO', short: 'Mango', name: 'Mango Candy', weight: '230g', price: 124.75, was: 138,
    tagline: 'Tropical sweetness in every sun-ripened bite',
    tags: ['Tropical Blast', 'Smooth Texture', '100% Veg'],
    style: 'raspberry', colour: '#F7C62F', labelInk: '#E8A200', icon: 'mango', tint: ['#FFF9E2', '#FFE394'],
    image: 'https://shadanigroup.com/cdn/shop/files/Mango_Candy_1.webp?width=500',
  },
  {
    id: 'currant', handle: 'black-currant-candy', word: 'CURRANT', short: 'Black Currant', name: 'Black Currant Candy', weight: '230g', price: 124, was: 138,
    tagline: 'Luscious berry indulgence in every tangy-sweet bite',
    tags: ['Berry Blast', 'Hard Boiled', '100% Veg'],
    style: 'raspberry', colour: '#86717F', labelInk: '#2B2070', icon: 'berries', tint: ['#F6F0F7', '#D8C9E4'],
    image: 'https://shadanigroup.com/cdn/shop/files/Black_Currant.webp?width=500',
  },
  {
    id: 'lemon', handle: 'lemon-candy', word: 'LEMON', short: 'Lemon', name: 'Lemon Candy', weight: '230g', price: 124, was: 138,
    tagline: 'A zesty citrus punch in a vintage hard-boiled delight',
    tags: ['Lemon Zest', 'Hard Boiled', 'Energizing'],
    style: 'raspberry', colour: '#A9E39B', labelInk: '#C9B400', icon: 'lemon', tint: ['#F6FCE6', '#D5F0B4'],
    image: 'https://shadanigroup.com/cdn/shop/files/Lemon_Candy_1.webp?width=500',
  },
  {
    id: 'jeera', handle: 'jeera-goli', word: 'JEERA', short: 'Jeera Goli', name: 'Jeera Goli', weight: '230g', price: 133, was: 148,
    tagline: 'A tangy burst of traditional flavours',
    tags: ['15% Whole Cumin', 'Tangy & Spicy', 'Digestive Aid'],
    style: 'goli', colour: '#C4B59F', labelInk: '#5B4A36', icon: 'cumin', tint: ['#F9F4EA', '#E6D8C0'],
    image: 'https://shadanigroup.com/cdn/shop/files/Shadani_Jeera_Goli_can.webp?width=500',
  },
];

export const productUrl = (f) => `https://shadanigroup.com/products/${f.handle}`;
