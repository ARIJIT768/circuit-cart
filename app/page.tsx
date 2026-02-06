"use client";
import React, { useState, useEffect } from 'react';
import { products, type Product } from './products'; 

// --- CONSTANTS ---
const MIN_ORDER_VALUE = 200;
const PLATFORM_FEE = 20;

export default function Home() {
  // --- STATE ---
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // UI State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form'>('cart');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', pincode: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categories = ["all", "microcontrollers", "components", "tools", "kits", "projects"];
  
  // --- CALCULATIONS ---
  const subTotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const grandTotal = subTotal + PLATFORM_FEE;

  // Theme Init
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category.toLowerCase() === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- ACTIONS ---
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product, qty: 1 }];
    });
    showToast(`Added ${product.name} to cart!`, 'success');
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => item.product.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- CHECKOUT LOGIC ---

  // 1. Validate, Check Min Order, and Show Summary
  const handleReviewOrder = () => {
    // Validation 1: Missing Details
    if (!formData.name || !formData.phone || !formData.address || !formData.pincode) {
      showToast("Please fill in all details!", 'error');
      return;
    }

    // Validation 2: Minimum Order Value
    if (subTotal < MIN_ORDER_VALUE) {
        showToast(`Minimum order value is ₹${MIN_ORDER_VALUE}. Please add more items.`, 'error');
        return;
    }

    setIsOrderSummaryOpen(true); // Open the Bill Popup
  };

  // 2. Final Confirm and Redirect
  const confirmOrder = () => {
    let message = `*New Order from Circuit Cart*\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${formData.name}\n`;
    message += `Phone: ${formData.phone}\n`;
    message += `Address: ${formData.address} (${formData.pincode})\n\n`;
    message += `*Order Summary:*\n`;
    cart.forEach(item => { 
        message += `▫️ ${item.product.name} x${item.qty} = ₹${item.product.price * item.qty}\n`; 
    });
    message += `\nSubtotal: ₹${subTotal}`;
    message += `\nPlatform Fee: ₹${PLATFORM_FEE}`;
    message += `\n*GRAND TOTAL: ₹${grandTotal}*`;
    message += `\n\n_(Customer agreed to No Return Policy)_`;

    window.open(`https://wa.me/918910436873?text=${encodeURIComponent(message)}`, '_blank');
    
    // Cleanup
    setCart([]); 
    setIsCartOpen(false); 
    setIsOrderSummaryOpen(false);
    setCheckoutStep('cart'); 
    showToast("Order placed successfully!", 'success');
  };

  const getOriginalPrice = (price: number, discountStr?: string) => {
      if(!discountStr) return null;
      const discount = parseInt(discountStr);
      return Math.round(price / (1 - discount/100));
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''} bg-white dark:bg-gray-900`}>
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md border-b border-amber-100 dark:border-gray-800 transition-colors duration-300">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg"><i className="fas fa-microchip text-white text-xl"></i></div>
            <span className="text-2xl font-black text-gray-800 dark:text-white tracking-tighter">CIRCUIT <span className="text-amber-500">CART</span></span>
          </div>
          <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
            <input type="text" placeholder="Search components..." className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-gray-200 transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <i className="fas fa-search absolute left-4 top-3 text-gray-400"></i>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              <i className={`fas ${isDarkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-gray-600'}`}></i>
            </button>
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              <i className="fas fa-shopping-cart text-xl text-gray-700 dark:text-gray-200"></i>
              {cartCount > 0 && (<span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">{cartCount}</span>)}
            </button>
            <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><i className="fas fa-bars text-xl text-gray-700 dark:text-gray-200"></i></button>
          </div>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-300 bg-white dark:bg-gray-900 ${isMobileMenuOpen ? 'max-h-96 border-b dark:border-gray-800' : 'max-h-0'}`}>
            <div className="p-4 space-y-4">
                <input type="text" placeholder="Search..." className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <div className="flex flex-col space-y-2">{categories.map(cat => (<button key={cat} onClick={() => { setActiveCategory(cat); setIsMobileMenuOpen(false); }} className={`text-left px-4 py-2 rounded-lg capitalize font-medium ${activeCategory === cat ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-600 dark:text-gray-300'}`}>{cat}</button>))}</div>
            </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-4 text-center">
        <div className="inline-block p-2 px-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold text-sm mb-6 animate-float shadow-sm">🚀 Premium Components for Creators</div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 text-gray-900 dark:text-white tracking-tight drop-shadow-xl">BUILD THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">FUTURE</span></h1>
        <div className="sticky top-20 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm py-2">
          <div className="flex flex-wrap justify-center gap-2">{categories.map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-full font-bold text-sm uppercase transition-all ${activeCategory === cat ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}>{cat}</button>))}</div>
        </div>
      </section>

      {/* Product Grid */}
      <main className="container mx-auto px-4 py-8 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredProducts.map((product) => {
            const originalPrice = getOriginalPrice(product.price, product.discount);
            return (
              <div key={product.id} className="animate-pop-in bg-white dark:bg-gray-850 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 group hover:border-amber-500 hover:shadow-2xl transition-all flex flex-col h-full">
                <div className="aspect-square p-6 relative bg-white cursor-pointer" onClick={() => setSelectedProduct(product)}>
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  {product.discount && (<span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md">-{product.discount}% OFF</span>)}
                </div>
                <div className="p-5 flex flex-col flex-grow bg-white dark:bg-gray-850">
                  <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-500 tracking-wider mb-1 bg-amber-50 dark:bg-amber-900/20 w-fit px-2 py-1 rounded">{product.category}</span>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight cursor-pointer hover:text-amber-600 transition-colors" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex flex-col">
                        {originalPrice && (<span className="text-xs text-gray-400 line-through font-semibold">₹{originalPrice}</span>)}
                        <span className="text-2xl font-black text-gray-900 dark:text-white">₹{product.price}</span>
                    </div>
                    <button onClick={() => addToCart(product)} className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95">
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
        })}
      </main>

      {/* --- MODALS --- */}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-pop-in flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-100 dark:bg-gray-800 p-8 flex items-center justify-center md:w-1/2"><img src={selectedProduct.image} alt="" className="max-h-64 object-contain" /></div>
            <div className="p-8 md:w-1/2 flex flex-col">
              <div className="flex justify-between items-start"><h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{selectedProduct.name}</h2><button onClick={() => setSelectedProduct(null)}><i className="fas fa-times text-gray-400 hover:text-red-500 text-xl"></i></button></div>
              <div className="my-4">
                 <p className="text-3xl font-bold text-amber-600">₹{selectedProduct.price}</p>
                 {selectedProduct.discount && <p className="text-sm text-gray-500 line-through">Original: ₹{getOriginalPrice(selectedProduct.price, selectedProduct.discount)}</p>}
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-6 flex-grow overflow-y-auto max-h-40 border border-amber-100 dark:border-amber-900/30">
                  <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Specifications</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{selectedProduct.details || selectedProduct.desc}</p>
              </div>
              <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition shadow-lg">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW: ORDER SUMMARY / BILL POPUP --- */}
      {isOrderSummaryOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-pop-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 bg-amber-50 dark:bg-gray-800 border-b border-amber-100 dark:border-gray-700">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><i className="fas fa-file-invoice-dollar text-amber-600"></i> Order Summary</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Please review your details before confirming.</p>
                </div>
                
                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                     
                     {/* NO RETURN BANNER */}
                     <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r flex items-start gap-3">
                         <i className="fas fa-exclamation-triangle text-red-500 mt-1"></i>
                         <div>
                             <h4 className="text-red-700 dark:text-red-400 font-bold text-sm uppercase">No Return Policy</h4>
                             <p className="text-xs text-red-600 dark:text-red-300">Goods once sold will not be taken back. Please ensure your order is correct.</p>
                         </div>
                     </div>

                     {/* Shipping Info */}
                     <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 border-b border-gray-200 dark:border-gray-600 pb-2">Customer Details</h3>
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                            <p className="flex justify-between"><span>Name:</span> <span className="font-bold">{formData.name}</span></p>
                            <p className="flex justify-between"><span>Phone:</span> <span className="font-bold">{formData.phone}</span></p>
                            <p className="flex justify-between"><span>Pincode:</span> <span className="font-bold">{formData.pincode}</span></p>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">{formData.address}</p>
                        </div>
                     </div>

                     {/* Bill */}
                     <div>
                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 border-b border-gray-200 dark:border-gray-600 pb-2">Items Bill</h3>
                        <div className="space-y-3">
                            {cart.map(item => (
                                <div key={item.product.id} className="flex justify-between text-sm">
                                    <span className="text-gray-700 dark:text-gray-300 truncate w-2/3"><span className="font-bold">{item.qty}x</span> {item.product.name}</span>
                                    <span className="font-bold text-gray-900 dark:text-white">₹{item.product.price * item.qty}</span>
                                </div>
                            ))}
                        </div>
                        
                        {/* Summary Logic */}
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>₹{subTotal}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>Platform Fee</span>
                                <span>₹{PLATFORM_FEE}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">Grand Total</span>
                                <span className="font-black text-2xl text-amber-600">₹{grandTotal}</span>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button onClick={() => setIsOrderSummaryOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">Edit</button>
                    <button onClick={confirmOrder} className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 transform active:scale-95 transition">
                        Confirm Order <i className="fab fa-whatsapp text-xl"></i>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col p-6 animate-pop-in">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><i className="fas fa-shopping-bag text-amber-600"></i> Your Cart ({cartCount})</h2>
                <button onClick={() => setIsCartOpen(false)}><i className="fas fa-times text-gray-500 hover:text-red-500 text-xl"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (<div className="text-center py-20 opacity-50"><i className="fas fa-shopping-basket text-6xl mb-4 text-gray-300"></i><p>Your cart is empty.</p></div>) : (
                checkoutStep === 'cart' ? cart.map(item => (
                  <div key={item.product.id} className="flex gap-4 p-3 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2"><img src={item.product.image} className="max-w-full max-h-full object-contain" alt="" /></div>
                    <div className="flex-1"><h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{item.product.name}</h4><p className="text-amber-600 font-bold text-sm">₹{item.product.price * item.qty}</p><div className="flex justify-between items-center mt-2"><div className="flex items-center gap-2"><button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded text-xs hover:bg-amber-500 hover:text-white flex items-center justify-center"><i className="fas fa-minus"></i></button><span className="text-sm font-bold text-gray-900 dark:text-white w-4 text-center">{item.qty}</span><button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded text-xs hover:bg-amber-500 hover:text-white flex items-center justify-center"><i className="fas fa-plus"></i></button></div><button onClick={() => removeFromCart(item.product.id)} className="text-gray-400 hover:text-red-500"><i className="fas fa-trash"></i></button></div></div>
                  </div>
                )) : (<div className="space-y-4 animate-pop-in"><h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Delivery Details</h3><input type="text" placeholder="Full Name" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /><input type="tel" placeholder="Phone Number" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /><textarea placeholder="Address" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 h-24 text-gray-900 dark:text-white" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea><input type="text" placeholder="Pincode" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} /></div>)
              )}
            </div>
            {cart.length > 0 && (<div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800"><div className="flex justify-between mb-4 text-xl font-black text-gray-900 dark:text-white"><span>Total</span><span>₹{subTotal}</span></div>{checkoutStep === 'cart' ? (<button onClick={() => setCheckoutStep('form')} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2">Proceed to Buy <i className="fas fa-arrow-right"></i></button>) : (<div className="flex gap-2"><button onClick={() => setCheckoutStep('cart')} className="flex-1 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white py-4 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-700">Back</button><button onClick={handleReviewOrder} className="flex-[2] bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">Review Order <i className="fas fa-arrow-right"></i></button></div>)}</div>)}
          </div>
        </div>
      )}

      {toast && (<div className={`fixed bottom-10 right-5 z-[70] px-6 py-4 rounded-xl shadow-2xl text-white font-bold flex items-center gap-3 animate-pop-in ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}><i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>{toast.msg}</div>)}
    </div>
  );
}