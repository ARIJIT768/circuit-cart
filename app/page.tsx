"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  rating: number;
  image: string;
  desc: string;
  details: string;
  discount?: string;
  icon?: string;
  componentsList?: string[];
  variants?: string[];
}

const MIN_ORDER_VALUE = 200;
const PLATFORM_FEE = 20;

export default function Home() {
  const router = useRouter();

  // 1. STATE
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); 
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form'>('cart');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', pincode: '' });

  const categories = ["all", "microcontrollers", "components", "tools", "kits", "projects"];
  
  const subTotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const grandTotal = subTotal + PLATFORM_FEE;

  // 2. EFFECTS
  
  // Safe Auth Initialization
  useEffect(() => {
    let mounted = true; // Safety flag

    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    });

    async function fetchProducts() {
      setIsLoading(true);
      const { data, error } = await supabase.from('inventory').select('*').order('id', { ascending: true });
      if (!error && data && mounted) setProducts(data as Product[]);
      if (mounted) setIsLoading(false);
    }
    fetchProducts();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Safe Cart Fetching (Depends ONLY on user?.id)
  useEffect(() => {
    let mounted = true;

    const fetchSavedCart = async () => {
      if (authLoading) return; // Wait for auth to settle

      if (user?.id) {
        const { data } = await supabase
          .from('user_carts')
          .select('cart_data')
          .eq('user_id', user.id)
          .single();

        if (mounted && data?.cart_data) {
          setCart(data.cart_data);
        }
      } else if (mounted) {
        setCart([]); // Only clear if explicitly logged out
      }
    };
    
    fetchSavedCart();
    
    return () => { mounted = false; };
  }, [user?.id, authLoading]); 

  // 3. ACTIONS
  
  const syncCartToCloud = async (newCart: any[]) => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      await supabase
        .from('user_carts')
        .upsert({ user_id: user.id, cart_data: newCart, updated_at: new Date() });
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCart([]);
    setIsCartOpen(false);
    showToast("Logged out successfully", 'success');
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const newCart = existing 
        ? prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item)
        : [...prev, { product, qty: 1 }];
      syncCartToCloud(newCart);
      return newCart;
    });
    showToast(`Added ${product.name} to cart!`, 'success');
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => {
      const newCart = prev.map(item => item.product.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item);
      syncCartToCloud(newCart);
      return newCart;
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const newCart = prev.filter(item => item.product.id !== id);
      syncCartToCloud(newCart);
      return newCart;
    });
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const confirmOrder = () => {
    if (subTotal < MIN_ORDER_VALUE) {
        showToast(`Minimum order value is ₹${MIN_ORDER_VALUE}.`, 'error');
        return;
    }
    let message = `*New Order from Circuit Cart*\n\nName: ${formData.name}\nPhone: ${formData.phone}\nAddress: ${formData.address}\n\n*Items:*\n`;
    cart.forEach(item => { message += `▫️ ${item.product.name} x${item.qty} = ₹${item.product.price * item.qty}\n`; });
    message += `\n*TOTAL: ₹${grandTotal}*`;

    window.open(`https://wa.me/917980125013?text=${encodeURIComponent(message)}`, '_blank');
    setCart([]); 
    setIsCartOpen(false); 
    setIsOrderSummaryOpen(false);
    showToast("Order placed via WhatsApp!", 'success');
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category.toLowerCase() === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getOriginalPrice = (price: number, discountStr?: string) => {
      if(!discountStr) return null;
      return Math.round(price / (1 - parseInt(discountStr)/100));
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-white dark:bg-gray-900 font-sans`}>
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md border-b border-amber-100 dark:border-gray-800 transition-colors">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg"><i className="fas fa-microchip text-white text-xl"></i></div>
            <span className="text-2xl font-black text-gray-800 dark:text-white tracking-tighter uppercase">Circuit <span className="text-amber-500">Cart</span></span>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
            <input type="text" placeholder="Search components..." className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-gray-200 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <i className="fas fa-search absolute left-4 top-3 text-gray-400"></i>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <button type="button" onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors">
              <i className={`fas ${isDarkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-gray-600'}`}></i>
            </button>

            {authLoading ? (
              <div className="w-20 h-8 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl"></div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 hidden lg:block font-bold uppercase tracking-tighter">
                  {user.user_metadata?.display_name || user.email?.split('@')[0]}
                </span>
                <button type="button" onClick={handleLogout} className="p-2 px-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold border border-transparent hover:border-red-500 hover:text-red-500 transition-all">
                  Logout
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => router.push('/auth')} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-500/20">
                Login
              </button>
            )}

            {/* Added type="button" to prevent accidental form submits on cart click */}
            <button type="button" onClick={() => setIsCartOpen(true)} className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors">
              <i className="fas fa-shopping-cart text-xl text-gray-700 dark:text-gray-200"></i>
              {cartCount > 0 && (<span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">{cartCount}</span>)}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-4 text-center">
        <div className="inline-block p-2 px-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold text-sm mb-6 shadow-sm">🚀 Premium Components for Creators</div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">BUILD THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">FUTURE</span></h1>
        <div className="sticky top-20 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm py-2">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(cat => (<button type="button" key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-full font-bold text-sm uppercase transition-all ${activeCategory === cat ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}>{cat}</button>))}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <main className="container mx-auto px-4 py-8 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center py-24">
             <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="mt-4 text-gray-500 font-bold tracking-widest uppercase">Loading Inventory...</p>
          </div>
        ) : filteredProducts.map((product) => {
            const originalPrice = getOriginalPrice(product.price, product.discount);
            return (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 group hover:border-amber-500 transition-all flex flex-col h-full animate-pop-in">
                <div className="aspect-square p-6 relative bg-white dark:bg-gray-800 cursor-pointer" onClick={() => setSelectedProduct(product)}>
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  {product.discount && (<span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md">-{product.discount}% OFF</span>)}
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider mb-1 bg-amber-50 dark:bg-amber-900/20 w-fit px-2 py-1 rounded">{product.category}</span>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 cursor-pointer hover:text-amber-600" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex flex-col">
                        {originalPrice && (<span className="text-xs text-gray-400 line-through font-semibold">₹{originalPrice}</span>)}
                        <span className="text-2xl font-black text-gray-900 dark:text-white">₹{product.price}</span>
                    </div>
                    <button type="button" onClick={() => addToCart(product)} className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95">
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
        })}
      </main>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-pop-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-100 dark:bg-gray-800 p-8 flex items-center justify-center md:w-1/2"><img src={selectedProduct.image} alt="" className="max-h-64 object-contain" /></div>
            <div className="p-8 md:w-1/2 flex flex-col">
              <div className="flex justify-between items-start"><h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{selectedProduct.name}</h2><button type="button" onClick={() => setSelectedProduct(null)}><i className="fas fa-times text-gray-400 hover:text-red-500 text-xl"></i></button></div>
              <p className="text-3xl font-bold text-amber-600 my-4">₹{selectedProduct.price}</p>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-6 flex-grow overflow-y-auto max-h-40 border border-amber-100 dark:border-amber-900/30">
                 <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Specifications</h4>
                 <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{selectedProduct.details || selectedProduct.desc}</p>
                 {selectedProduct.componentsList && (
                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/50">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Kit Includes:</p>
                        <ul className="list-disc pl-5 text-xs text-gray-700 dark:text-gray-300 mt-1">
                            {selectedProduct.componentsList.map((item, idx) => <li key={idx}>{item}</li>)}
                        </ul>
                    </div>
                 )}
              </div>
              <button type="button" onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition shadow-lg">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col p-6 animate-pop-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Your Cart ({cartCount})</h2>
              <button type="button" onClick={() => setIsCartOpen(false)}><i className="fas fa-times text-gray-400 hover:text-red-500 text-xl"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (<p className="text-center py-20 opacity-50 text-gray-900 dark:text-white">Your cart is empty.</p>) : (
                checkoutStep === 'cart' ? cart.map(item => (
                  <div key={item.product.id} className="flex gap-4 p-3 border dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <img src={item.product.image} className="w-16 h-16 object-contain bg-white rounded-lg p-1" alt="" />
                    <div className="flex-1"><h4 className="font-bold text-sm text-gray-900 dark:text-white">{item.product.name}</h4><p className="text-amber-600 font-bold">₹{item.product.price * item.qty}</p>
                    <div className="flex justify-between mt-2"><div className="flex items-center gap-2"><button type="button" onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded text-xs">-</button><span className="text-sm font-bold text-gray-900 dark:text-white">{item.qty}</span><button type="button" onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded text-xs">+</button></div><button type="button" onClick={() => removeFromCart(item.product.id)} className="text-gray-400 hover:text-red-500"><i className="fas fa-trash"></i></button></div></div>
                  </div>
                )) : (<div className="space-y-4 text-gray-900 dark:text-white"><input type="text" placeholder="Full Name" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /><input type="tel" placeholder="Phone" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /><textarea placeholder="Address" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none h-24" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea><input type="text" placeholder="Pincode" className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} /></div>)
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between mb-4 text-xl font-black text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>₹{subTotal}</span>
                </div>
                
                {user ? (
                  <button 
                    type="button"
                    onClick={() => checkoutStep === 'cart' ? setCheckoutStep('form') : setIsOrderSummaryOpen(true)} 
                    className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg"
                  >
                    {checkoutStep === 'cart' ? 'Proceed to Buy' : 'Review Order'}
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => { setIsCartOpen(false); router.push('/auth'); }}
                    className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-lock text-xs"></i>
                    Login to Checkout
                  </button>
                )}
                
                {isSyncing && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                    <p className="text-[10px] text-amber-600 uppercase font-black tracking-widest italic">Cloud Syncing...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Summary Modal */}
      {isOrderSummaryOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-pop-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 bg-amber-50 dark:bg-gray-800 border-b border-amber-100 dark:border-gray-700">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><i className="fas fa-file-invoice-dollar text-amber-600"></i> Order Summary</h2>
                </div>
                <div className="p-6 space-y-4">
                     <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
                         <h4 className="text-red-700 dark:text-red-400 font-bold text-sm uppercase">No Return Policy</h4>
                         <p className="text-xs text-red-600 dark:text-red-300">Goods once sold will not be taken back.</p>
                     </div>
                     <div className="text-sm text-gray-700 dark:text-gray-300">
                        <p className="flex justify-between"><span>Name:</span> <strong>{formData.name}</strong></p>
                        <p className="flex justify-between"><span>Phone:</span> <strong>{formData.phone}</strong></p>
                        <hr className="my-2 dark:border-gray-700" />
                        <div className="flex justify-between items-center pt-2">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">Grand Total</span>
                            <span className="font-black text-2xl text-amber-600">₹{grandTotal}</span>
                        </div>
                     </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-800 flex gap-3">
                    <button type="button" onClick={() => setIsOrderSummaryOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">Edit</button>
                    <button type="button" onClick={confirmOrder} className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">Confirm <i className="fab fa-whatsapp"></i></button>
                </div>
            </div>
        </div>
      )}

      {toast && (<div className={`fixed bottom-10 right-5 z-[70] px-6 py-4 rounded-xl shadow-2xl text-white font-bold flex items-center gap-3 animate-pop-in ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>{toast.msg}</div>)}
    </div>
  );
}