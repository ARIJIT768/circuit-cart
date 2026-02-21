"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export interface Product {
  id: number; name: string; price: number; category: string; rating: number;
  image: string; desc: string; details: string; discount?: string;
}

export interface Order {
  id: string; created_at: string; total: number; status: string;
  delivery_date: string; items: { product: Product; qty: number }[];
}

const MIN_ORDER_VALUE = 200;

export default function Home() {
  const router = useRouter();

  // 1. STATE & LOGIC
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'shop' | 'orders'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form'>('cart');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', pincode: '', utr: '' });

  // DISCOUNT & FEES STATE
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const categories = ["all", "microcontrollers", "components", "tools", "kits", "projects"];
  
  // PRICING MATH
  const subTotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  
  // 🛡️ FIX: Both fees become 0 if they cross the ₹200 threshold!
  const platformFee = subTotal > 0 && subTotal < MIN_ORDER_VALUE ? 10 : 0;
  const deliveryFee = subTotal > 0 && subTotal < MIN_ORDER_VALUE ? 10 : 0;
  
  // 10% off up to ₹15 max limit (Zomato style psychology)
  let discountAmount = 0;
  if (appliedCoupon === 'CIRCUIT10' && subTotal >= 100) {
    discountAmount = Math.floor(Math.min(subTotal * 0.1, 15));
  }

  const grandTotal = Math.max(0, subTotal + platformFee + deliveryFee - discountAmount);

  // Remove coupon automatically if they remove items and drop below ₹100
  useEffect(() => {
    if (appliedCoupon && subTotal < 100) {
      setAppliedCoupon(null);
      setCouponCode("");
      showToast("Coupon removed! Cart value must be ₹100+", "error");
    }
  }, [subTotal, appliedCoupon]);

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'CIRCUIT10') {
      if (subTotal >= 100) {
        setAppliedCoupon('CIRCUIT10');
        showToast("Awesome! You're saving money today.", "success");
      } else {
        showToast("Add items worth ₹100 to use this deal.", "error");
      }
    } else {
      showToast("Invalid or expired coupon code.", "error");
    }
  };

  // INITIALIZATION & TAB RESTORATION
  useEffect(() => {
    const savedView = localStorage.getItem('circuit_cart_view');
    if (savedView === 'shop' || savedView === 'orders') setCurrentView(savedView);

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      const { data: inventory } = await supabase.from('inventory').select('*').order('id', { ascending: true });
      if (inventory) setProducts(inventory as Product[]);
      setIsLoading(false);
    };
    init();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => authListener.subscription.unsubscribe();
  }, []);

  const switchView = (view: 'shop' | 'orders') => {
    setCurrentView(view);
    localStorage.setItem('circuit_cart_view', view);
  };

  useEffect(() => {
    if (user?.id) {
      supabase.from('user_carts').select('cart_data').eq('user_id', user.id).single().then(({ data }) => {
        if (data?.cart_data) setCart(data.cart_data);
      });
      if (currentView === 'orders') fetchOrders();
    }
  }, [user?.id, currentView]);

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (data) setUserOrders(data as Order[]);
  };

  const syncCart = async (newCart: any[]) => {
    if (!user?.id) return;
    await supabase.from('user_carts').upsert({ user_id: user.id, cart_data: newCart, updated_at: new Date() });
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    const newCart = existing 
      ? cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      : [...cart, { product, qty: 1 }];
    setCart(newCart); syncCart(newCart);
    showToast(`Added ${product.name}`, 'success');
  };

  const updateQty = (id: number, delta: number) => {
    const newCart = cart.map(item => item.product.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item);
    setCart(newCart); syncCart(newCart);
  };

  const removeFromCart = (id: number) => {
    const newCart = cart.filter(item => item.product.id !== id);
    setCart(newCart); syncCart(newCart);
  };

  const confirmInternalOrder = async () => {
    if (subTotal === 0) return;

    const cleanUtr = formData.utr.trim();

    // 🛡️ SECURITY LAYER 1: STRICT 12-DIGIT VALIDATION
    const utrRegex = /^[0-9]{12}$/;
    if (!utrRegex.test(cleanUtr)) {
      showToast("Invalid! UTR must be exactly 12 numeric digits.", "error");
      return;
    }

    setIsSubmitting(true);

    // 🛡️ SECURITY LAYER 2: DUPLICATE UTR BLOCKER
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_info->>utr', cleanUtr)
      .maybeSingle();

    if (existingOrder) {
      showToast("Security Alert: This UTR has already been used!", "error");
      setIsSubmitting(false);
      return;
    }

    // 🛡️ IF SAFE, DISPATCH TO DATABASE
    const { error } = await supabase.from('orders').insert([{
      user_id: user?.id,
      items: cart,
      total: grandTotal,
      customer_info: { ...formData, utr: cleanUtr, applied_coupon: appliedCoupon },
      status: 'pending'
    }]);

    setIsSubmitting(false);

    if (error) {
      showToast("Logistics error. Try again.", "error");
    } else {
      showToast("Payment Verified & Order Dispatched!", "success");
      setCart([]); syncCart([]); setIsCartOpen(false); setIsOrderSummaryOpen(false); 
      setFormData({...formData, utr: ''}); setAppliedCoupon(null); setCouponCode("");
      switchView('orders');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setCart([]); setIsAccountOpen(false); switchView('shop');
    window.location.reload();
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getProgressWidth = (order: Order) => {
    if (order.status === 'delivered') return '100%';
    if (order.status === 'shipped') return '75%';
    if (order.status === 'confirmed') return '45%';
    return '15%'; 
  };

  const filteredProducts = products.filter(p => (activeCategory === 'all' || p.category.toLowerCase() === activeCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen font-sans bg-[#020617] text-white overflow-x-hidden selection:bg-amber-500/30">
      
      {/* 1. HEADER */}
      <header className="fixed w-full z-50 bg-[#131921] shadow-2xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-4 md:gap-8">
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button onClick={() => setIsMenuOpen(true)} className="md:hidden text-white text-2xl p-2 active:scale-90"><i className="fas fa-bars"></i></button>
            <div className="cursor-pointer" onClick={() => {switchView('shop'); window.scrollTo(0,0);}}>
              <span className="text-xl md:text-2xl font-black uppercase tracking-tight">Circuit<span className="text-amber-500">Cart</span></span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl h-10 md:h-11 overflow-hidden rounded-lg focus-within:ring-2 focus-within:ring-amber-500 hidden md:flex shadow-inner">
            <input type="text" className="flex-1 px-4 text-slate-900 bg-white outline-none text-sm font-semibold" placeholder="Search components, Arduino, tools..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button className="bg-amber-500 px-6 text-slate-900 transition-colors hover:bg-amber-600"><i className="fas fa-search"></i></button>
          </div>

          <div className="flex items-center gap-4 md:gap-8 shrink-0 relative">
            <div className="hidden md:block leading-tight cursor-pointer" onClick={() => user ? setIsAccountOpen(!isAccountOpen) : router.push('/auth')}>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Hello, {user?.user_metadata?.display_name || 'Sign In'}</p>
              <p className="text-sm font-bold uppercase">Account Hub <i className="fas fa-caret-down text-[10px] ml-1"></i></p>
            </div>
            
            {isAccountOpen && user && (
              <div className="absolute top-16 right-0 w-64 bg-[#131921] border border-slate-700 rounded-xl shadow-2xl p-4 z-[70] animate-pop-in">
                <button onClick={() => {switchView('orders'); setIsAccountOpen(false);}} className="w-full text-left text-sm font-bold p-3 hover:text-amber-500 border-b border-slate-800">My Orders</button>
                <button onClick={handleLogout} className="w-full bg-slate-800 text-red-500 font-bold py-2 rounded-lg mt-3 text-xs uppercase">Sign Out</button>
              </div>
            )}

            <button onClick={() => setIsCartOpen(true)} className="relative p-2 active:scale-90 transition-transform">
              <i className="fas fa-shopping-cart text-2xl text-amber-500"></i>
              {cartCount > 0 && <span className="absolute top-0 right-0 bg-white text-slate-900 font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#131921]">{cartCount}</span>}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex h-10 overflow-hidden rounded-lg shadow-inner">
            <input type="text" className="flex-1 px-4 text-slate-900 bg-white outline-none text-sm font-semibold" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button className="bg-amber-500 px-5 text-slate-900"><i className="fas fa-search"></i></button>
          </div>
        </div>

        {/* Desktop Category Bar */}
        <div className="hidden md:flex bg-[#232f3e] border-t border-slate-700/50 h-10 items-center justify-center gap-8 text-xs font-bold uppercase tracking-wider">
          {categories.map(cat => (
            <span key={cat} onClick={() => {setActiveCategory(cat); switchView('shop');}} className={`cursor-pointer px-3 py-1 rounded transition-colors ${activeCategory === cat ? 'bg-amber-500 text-slate-900' : 'text-slate-300 hover:text-white'}`}>{cat}</span>
          ))}
        </div>
      </header>

      {/* 2. MOBILE HAMBURGER MENU */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsMenuOpen(false)}></div>
          <div className="relative w-[85%] max-w-sm bg-[#131921] h-full shadow-2xl flex flex-col border-r border-slate-800 animate-slide-right will-change-transform">
            
            <div className="p-6 bg-[#232f3e] flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#232f3e] text-2xl">
                <i className="fas fa-user"></i>
              </div>
              <div>
                <p className="text-sm font-bold uppercase text-white leading-none mb-1">HELLO,</p>
                <p className="text-xl font-bold text-amber-500 line-clamp-1 leading-none">{user ? user.user_metadata?.display_name : 'Sign In'}</p>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col space-y-6">
              <div className="flex-1">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-5 tracking-widest">Shop By Category</h3>
                <ul className="space-y-5">
                  {categories.map(cat => (
                    <li key={cat} onClick={() => { setActiveCategory(cat); setIsMenuOpen(false); switchView('shop'); }} className={`text-base font-bold capitalize cursor-pointer transition-colors ${activeCategory === cat ? 'text-amber-500' : 'text-slate-200'}`}>{cat}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-slate-800 pt-6 shrink-0 mb-4">
                <h3 className="text-xs font-black uppercase text-slate-400 mb-5 tracking-widest">Settings</h3>
                <ul className="space-y-6 text-base font-bold text-slate-200">
                  <li className="cursor-pointer" onClick={() => {switchView('orders'); setIsMenuOpen(false);}}>Your Account</li>
                  {user && (
                    <li className="text-red-500 cursor-pointer flex items-center gap-3" onClick={handleLogout}>
                      <span className="flex items-center justify-center w-7 h-7 rounded-full border border-red-500 text-xs font-black">N</span>
                      Sign Out
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN VIEW SWITCHER */}
      <div className="container mx-auto pt-36 md:pt-44 px-4 pb-24 max-w-6xl">
        {currentView === 'shop' ? (
          <main className="space-y-4 md:space-y-5 animate-pop-in">
            {isLoading ? (
               <div className="py-24 text-center"><i className="fas fa-circle-notch fa-spin text-4xl text-amber-500"></i></div>
            ) : filteredProducts.map(p => (
              <div key={p.id} className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-row shadow-lg min-h-[160px] md:min-h-[200px] will-change-transform">
                <div className="w-32 md:w-56 bg-slate-800/30 flex items-center justify-center p-4 cursor-pointer shrink-0" onClick={() => setSelectedProduct(p)}>
                  <img src={p.image} className="max-h-24 md:max-h-36 object-contain blend-image" alt={p.name} />
                </div>
                <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm md:text-xl font-bold hover:text-amber-500 transition-colors cursor-pointer leading-tight mb-1" onClick={() => setSelectedProduct(p)}>{p.name}</h2>
                    <div className="flex items-center gap-1 text-amber-400 text-[10px] md:text-xs mb-2"><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star-half-alt"></i></div>
                    <p className="text-xs text-slate-400 line-clamp-2 hidden md:block italic">{p.desc}</p>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-1"><span className="text-xs font-bold text-amber-500">₹</span><span className="text-xl md:text-3xl font-black">{p.price}</span></div>
                      <p className="text-[10px] text-slate-500 line-through">M.R.P: ₹{Math.round(p.price * 1.5)}</p>
                    </div>
                    <button onClick={() => addToCart(p)} className="px-5 md:px-10 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-xs md:text-sm uppercase tracking-wider active:scale-95 transition-transform">Add</button>
                  </div>
                </div>
              </div>
            ))}
          </main>
        ) : (
          <div className="animate-pop-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
               <h2 className="text-2xl font-black uppercase">Logistics Tracking</h2>
               <button onClick={() => switchView('shop')} className="text-amber-500 font-bold text-sm">← Back to Shop</button>
            </div>
            
            {userOrders.length === 0 ? (
              <div className="py-20 text-center opacity-30 uppercase font-bold tracking-widest">No Active Shipment Signals</div>
            ) : userOrders.map(order => (
              <div key={order.id} className="bg-[#131921] border border-slate-800 rounded-2xl p-6 mb-8 shadow-2xl will-change-transform">
                <div className="flex flex-col md:flex-row justify-between mb-8 text-xs font-bold uppercase gap-4">
                  <div><p className="text-slate-500 mb-1">Manifest ID</p><p className="font-mono text-slate-300">#{order.id.slice(0, 8)}</p></div>
                  <div><p className="text-slate-500 mb-1">Status</p><p className="text-amber-500">{order.status}</p></div>
                  <div className="md:text-right">
                    <p className="text-slate-500 mb-1">Est. Arrival</p>
                    <p className="text-green-500">{order.delivery_date ? new Date(order.delivery_date).toDateString() : 'Pending Confirmation'}</p>
                  </div>
                </div>

                <div className="relative h-2.5 bg-slate-800 rounded-full mb-4 overflow-hidden border border-slate-700/50">
                  <div className="absolute top-0 left-0 h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-1000" style={{ width: getProgressWidth(order) }}></div>
                </div>
                <div className="flex justify-between text-[9px] md:text-[10px] font-black uppercase text-slate-500 px-1 tracking-tighter">
                   <span className={order.status === 'pending' ? 'text-green-500' : ''}>Dispatched</span>
                   <span className={order.status === 'confirmed' ? 'text-green-500' : ''}>Verified</span>
                   <span className={order.status === 'shipped' ? 'text-green-500' : ''}>In Transit</span>
                   <span className={order.status === 'delivered' ? 'text-green-500' : ''}>Arrived</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. MODALS (Checkout, Product Details, Cart) */}
      {isOrderSummaryOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90">
          <div className="bg-[#131921] w-full max-w-lg rounded-2xl p-6 md:p-8 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] animate-pop-in will-change-transform">
            <h2 className="text-2xl font-black uppercase text-white mb-6 border-b border-slate-800 pb-4">Secure Checkout</h2>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scroll space-y-6">
              
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5">
                 <h3 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Bill Details</h3>
                 
                 {/* ZOMATO STYLE ITEMISED BILL RECEIPT */}
                 <div className="space-y-3 mb-4 border-b border-slate-700/50 pb-4">
                   {cart.map(item => (
                     <div key={item.product.id} className="flex justify-between text-xs md:text-sm">
                       <span className="text-slate-300 font-medium truncate pr-4">{item.product.name} <span className="text-amber-500 ml-1">x{item.qty}</span></span>
                       <span className="text-white font-bold shrink-0">₹{item.product.price * item.qty}</span>
                     </div>
                   ))}
                 </div>
                 
                 <div className="space-y-2 text-xs text-slate-400 font-medium">
                   <div className="flex justify-between"><span>Item Total</span><span className="text-white">₹{subTotal}</span></div>
                   
                   {/* 🛡️ BOTH FEES SHOW AS STRUCK OUT WHEN CART IS OVER ₹200 */}
                   <div className="flex justify-between">
                     <span>Platform Fee</span>
                     {platformFee === 0 && subTotal > 0 ? (
                        <span className="text-green-500 font-bold"><span className="line-through text-slate-500 font-medium mr-1 text-[10px]">₹10</span>Free</span>
                     ) : (
                        <span className="text-white">₹{platformFee}</span>
                     )}
                   </div>
                   
                   <div className="flex justify-between">
                     <span>Delivery Partner Fee</span>
                     {deliveryFee === 0 && subTotal > 0 ? (
                        <span className="text-green-500 font-bold"><span className="line-through text-slate-500 font-medium mr-1 text-[10px]">₹10</span>Free</span>
                     ) : (
                        <span className="text-white">₹{deliveryFee}</span>
                     )}
                   </div>

                   {appliedCoupon && (
                     <div className="flex justify-between text-green-400 font-bold mt-1">
                       <span>Promo - ({appliedCoupon})</span>
                       <span>-₹{discountAmount}</span>
                     </div>
                   )}
                 </div>

                 <div className="border-t border-slate-800 pt-4 mt-3 flex justify-between items-center">
                   <span className="text-sm font-black text-amber-500 uppercase">To Pay</span>
                   <span className="text-3xl font-black text-white">₹{grandTotal}</span>
                 </div>
              </div>

              {/* LIVE PHONEPE UPI VERIFICATION SECTION */}
              <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-6 text-center space-y-5">
                 <h3 className="text-sm font-black uppercase text-amber-500 tracking-widest">Complete Your Payment</h3>
                 
                 <div className="bg-white p-3 inline-block rounded-xl">
                   <img 
                     src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=9547543695@axl&pn=CircuitCart&am=${grandTotal}&cu=INR`} 
                     alt="UPI QR" 
                     className="w-32 h-32"
                   />
                 </div>
                 
                 <p className="font-mono text-base font-bold text-white tracking-widest bg-slate-900 py-3 rounded-lg border border-slate-700">
                    9547543695@axl
                 </p>

                 <a 
                   href={`upi://pay?pa=9547543695@axl&pn=CircuitCart&am=${grandTotal}&cu=INR`} 
                   className="md:hidden block w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs uppercase shadow-lg transition-transform active:scale-95"
                 >
                   Pay via UPI App
                 </a>
                 
                 <div className="pt-5 border-t border-slate-700/50 text-left">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Enter 12-Digit UTR / Transaction ID</label>
                    <input 
                      type="text" 
                      maxLength={12}
                      placeholder="e.g. 123456789012" 
                      className="w-full p-4 bg-[#020617] border border-slate-700 rounded-xl text-white font-mono font-bold outline-none focus:border-amber-500 transition-colors" 
                      value={formData.utr} 
                      onChange={e => setFormData({...formData, utr: e.target.value.replace(/[^0-9]/g, '')})} 
                    />
                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest mt-3 flex items-start gap-2">
                      <i className="fas fa-shield-alt mt-0.5"></i>
                      Strict Anti-Fraud Active: Fake or reused UTRs will result in an immediate permanent IP & account ban.
                    </p>
                 </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 mt-4 border-t border-slate-800 shrink-0">
               <button onClick={() => setIsOrderSummaryOpen(false)} className="flex-1 py-4 font-bold text-slate-400 text-xs uppercase border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">Modify</button>
               <button 
                 onClick={confirmInternalOrder} 
                 disabled={isSubmitting}
                 className="flex-[2] py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-slate-900 disabled:text-slate-400 font-bold rounded-xl text-xs uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
               >
                 {isSubmitting ? <><i className="fas fa-circle-notch fa-spin"></i> Processing...</> : `Pay ₹${grandTotal}`}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#131921] h-full p-6 md:p-8 shadow-2xl flex flex-col border-l border-slate-700 animate-slide-left will-change-transform">
            <h2 className="text-xl font-bold uppercase text-white mb-6 flex justify-between">Your Cart <button onClick={() => setIsCartOpen(false)}><i className="fas fa-times text-slate-500"></i></button></h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scroll">
              
              {checkoutStep === 'cart' ? (
                <>
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                        <img src={item.product.image} className="w-16 h-16 object-contain bg-white rounded-md p-2 blend-image" />
                        <div className="flex-1 flex flex-col justify-between">
                          <h4 className="font-bold text-sm text-white line-clamp-2">{item.product.name}</h4>
                          <div className="flex items-end justify-between mt-2">
                            <p className="text-amber-500 font-black text-base">₹{item.product.price * item.qty}</p>
                            <div className="flex items-center gap-3">
                              <button onClick={() => updateQty(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded">-</button>
                              <span className="text-sm font-bold">{item.qty}</span>
                              <button onClick={() => updateQty(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded">+</button>
                              <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 ml-2"><i className="fas fa-trash"></i></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ZOMATO STYLE COUPON SECTION */}
                  {cart.length > 0 && (
                    <div className="mt-8 border border-dashed border-amber-500/50 bg-amber-500/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-amber-500 mb-3 text-sm font-bold">
                        <i className="fas fa-tags"></i> Apply Coupon
                      </div>
                      
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                          <div>
                            <p className="text-green-400 font-bold text-sm">'{appliedCoupon}' applied</p>
                            <p className="text-[10px] text-green-500/80">You saved ₹{discountAmount} on this order!</p>
                          </div>
                          <button onClick={() => {setAppliedCoupon(null); setCouponCode("");}} className="text-red-400 text-xs font-bold uppercase tracking-widest hover:text-red-300">Remove</button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] text-slate-400 mb-2 leading-tight">Use <b className="text-white">CIRCUIT10</b> for 10% OFF on orders above ₹100!</p>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="e.g. CIRCUIT10" 
                              className="flex-1 bg-[#020617] border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold uppercase outline-none focus:border-amber-500 text-white"
                              value={couponCode}
                              onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            />
                            <button onClick={handleApplyCoupon} className="px-4 bg-slate-800 hover:bg-slate-700 font-bold rounded-lg text-xs uppercase transition-colors">Apply</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MINI BILL SUMMARY FOR CART VIEW */}
                  {cart.length > 0 && (
                    <div className="mt-6 space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-6">
                       <div className="flex justify-between"><span>Item Total</span><span className="text-white">₹{subTotal}</span></div>
                       <div className="flex justify-between">
                          <span>Platform Fee {subTotal < MIN_ORDER_VALUE && <span className="text-[10px] ml-1">(Free over ₹200)</span>}</span>
                          {platformFee === 0 ? <span className="text-green-500 font-bold">Free</span> : <span className="text-white">₹{platformFee}</span>}
                       </div>
                       <div className="flex justify-between">
                          <span>Delivery Fee {subTotal < MIN_ORDER_VALUE && <span className="text-[10px] ml-1">(Free over ₹200)</span>}</span>
                          {deliveryFee === 0 ? <span className="text-green-500 font-bold">Free</span> : <span className="text-white">₹{deliveryFee}</span>}
                       </div>
                       {appliedCoupon && <div className="flex justify-between text-green-400 font-bold"><span>Discount</span><span>-₹{discountAmount}</span></div>}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold uppercase text-amber-500 mb-4 border-b border-slate-700 pb-2">Delivery Information</h3>
                  {['name', 'phone', 'address', 'pincode'].map(f => (
                    <div key={f}>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{f}</label>
                      <input type="text" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm outline-none focus:border-amber-500 transition-colors" value={(formData as any)[f]} onChange={e => setFormData({...formData, [f]: e.target.value})} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="mt-4 pt-5 border-t border-slate-700">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-slate-400 text-sm uppercase font-bold">To Pay</span>
                    <span className="text-2xl font-black text-white">₹{grandTotal}</span>
                  </div>
                  <button onClick={() => user ? (checkoutStep === 'cart' ? setCheckoutStep('form') : setIsOrderSummaryOpen(true)) : router.push('/auth')} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-sm md:text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-xl">
                    {checkoutStep === 'cart' ? 'Proceed to Checkout' : 'Review Final Order'}
                  </button>
                  {checkoutStep === 'form' && (
                     <button onClick={() => setCheckoutStep('cart')} className="w-full mt-3 py-3 text-slate-400 text-xs font-bold uppercase hover:text-white transition-colors">← Back to Cart</button>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#131921] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-slate-700 animate-pop-in will-change-transform">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors"><i className="fas fa-times"></i></button>
            <div className="md:w-1/2 bg-slate-900 p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-700"><img src={selectedProduct.image} className="max-h-52 md:max-h-72 object-contain blend-image" /></div>
            <div className="md:w-1/2 p-8 md:p-10 flex flex-col">
              <span className="text-xs font-bold uppercase text-amber-500 tracking-widest mb-2">{selectedProduct.category}</span>
              <h2 className="text-2xl md:text-2xl font-bold text-white leading-tight mb-3">{selectedProduct.name}</h2>
              <p className="text-amber-500 text-3xl md:text-2xl font-black mb-5">₹{selectedProduct.price}</p>
              <div className="flex-1 bg-slate-900 p-5 rounded-lg border border-slate-700 mb-6 overflow-y-auto max-h-48 custom-scroll">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{selectedProduct.details || selectedProduct.desc}</p>
              </div>
              <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-base md:text-sm uppercase transition-transform active:scale-95 shadow-lg">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-lg shadow-2xl ${toast.type === 'success' ? 'bg-amber-500 text-slate-900' : 'bg-red-600 text-white'} font-bold animate-pop-in text-sm flex items-center gap-2`}><i className="fas fa-check-circle text-lg"></i> {toast.msg}</div>
      )}

      <style jsx global>{`
        .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.97) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}