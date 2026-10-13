/*
 * DM Clothing V2: product catalog (NEWLY IMPLEMENTED, rebuilt after the reset).
 *
 * VERIFIED from your earlier notes: ids and prices for the three tees,
 * and that the signature hoodie and the snapback exist.
 * PLACEHOLDER: anything marked placeholder: true. Replace with real names and prices.
 *
 * Prices are in naira (whole numbers). Images: put files in /images and set "image".
 * Leave image as "" to show a gold DM monogram instead.
 */
window.DM_PRODUCTS = [
  { id: "dm-signature-tee",     name: "DM Signature Tee",     category: "T-Shirts", price: 25000, sizes: ["S","M","L","XL"], image: "", featured: true,  available: true, placeholder: false },
  { id: "dm-essential-tee",     name: "DM Essential Tee",     category: "T-Shirts", price: 22000, sizes: ["S","M","L","XL"], image: "", featured: false, available: true, placeholder: false },
  { id: "dm-oversized-tee",     name: "DM Oversized Tee",     category: "T-Shirts", price: 28000, sizes: ["M","L","XL","XXL"], image: "", featured: true,  available: true, placeholder: false },
  { id: "dm-signature-hoodie",  name: "DM Signature Hoodie",  category: "Hoodies",  price: 45000, sizes: ["S","M","L","XL"], image: "", featured: true,  available: true, placeholder: true },
  { id: "dm-essential-hoodie",  name: "DM Essential Hoodie",  category: "Hoodies",  price: 40000, sizes: ["S","M","L","XL"], image: "", featured: false, available: true, placeholder: true },
  { id: "dm-classic-snapback",  name: "DM Classic Snapback",  category: "Caps",     price: 15000, sizes: ["One size"],        image: "", featured: true,  available: true, placeholder: true },
  { id: "dm-adjustable-cap",    name: "DM Adjustable Cap",    category: "Caps",     price: 12000, sizes: ["One size"],        image: "", featured: false, available: true, placeholder: true },
  { id: "dm-gold-edition-tee",  name: "DM Gold Edition Tee",  category: "T-Shirts", price: 30000, sizes: ["S","M","L","XL"], image: "", featured: false, available: false, placeholder: true }
];
