'use client';
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
  stock: number;
}

export interface Order {
  id: string;
  created_at: string;
  total: number;
  status: string;
  delivery_date: string;
  items: { product: Product; qty: number }[];
}

export interface Review {
  id: string;
  product_id: number;
  user_name: string;
  rating: number;
  comment: string;
  image_url?: string;
  created_at: string;
}

const MIN_ORDER_VALUE = 200;

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'shop' | 'orders'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  const [allReviews, setAllReviews] = useState<
    { product_id: number; rating: number }[]
  >([]);
  const [sortBy, setSortBy] = useState<
    'featured' | 'price-asc' | 'price-desc' | 'rating-desc'
  >('featured');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form'>('cart');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    pincode: '',
    utr: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const categories = [
    'all',
    'microcontrollers',
    'components',
    'tools',
    'kits',
    'projects',
  ];

  const subTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const platformFee = subTotal > 0 && subTotal < MIN_ORDER_VALUE ? 10 : 0;
  const deliveryFee = subTotal > 0 && subTotal < MIN_ORDER_VALUE ? 10 : 0;

  let discountAmount = 0;
  if (appliedCoupon === 'CIRCUIT10' && subTotal >= 100) {
    discountAmount = Math.floor(Math.min(subTotal * 0.1, 15));
  }
  const grandTotal = Math.max(
    0,
    subTotal + platformFee + deliveryFee - discountAmount,
  );

  const upiLink = `upi://pay?pa=9547543695@axl&pn=Circuit%20Cart&am=${grandTotal}&cu=INR`;
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}&margin=10`;

  useEffect(() => {
    if (appliedCoupon && subTotal < 100) {
      setAppliedCoupon(null);
      setCouponCode('');
      showToast('Coupon removed! Cart value must be ₹100+', 'error');
    }
  }, [subTotal, appliedCoupon]);

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'CIRCUIT10') {
      if (subTotal >= 100) {
        setAppliedCoupon('CIRCUIT10');
        showToast("Awesome! You're saving money today.", 'success');
      } else {
        showToast('Add items worth ₹100 to use this deal.', 'error');
      }
    } else {
      showToast('Invalid or expired coupon code.', 'error');
    }
  };

  useEffect(() => {
    const savedView = localStorage.getItem('circuit_cart_view');
    if (savedView === 'shop' || savedView === 'orders')
      setCurrentView(savedView);

    const init = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session) {
        setIsRedirecting(true);
        router.replace('/auth');
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('checkout_info')
        .eq('id', session.user.id)
        .single();
      if (
        profileData?.checkout_info &&
        Object.keys(profileData.checkout_info).length > 0
      ) {
        setFormData((prev) => ({ ...prev, ...profileData.checkout_info }));
      }

      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .order('id', { ascending: true });
      if (inventory) setProducts(inventory as Product[]);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('product_id, rating');
      if (reviewsData) setAllReviews(reviewsData);

      setIsLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsRedirecting(true);
          router.replace('/auth');
        } else {
          setUser(session.user);
        }
      },
    );

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('user_carts')
        .select('cart_data')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.cart_data) setCart(data.cart_data);
        });
      fetchOrders();
    }
  }, [user?.id]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    if (data) setUserOrders(data as Order[]);
  };

  const switchView = (view: 'shop' | 'orders') => {
    setCurrentView(view);
    localStorage.setItem('circuit_cart_view', view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const syncCart = async (newCart: any[]) => {
    if (!user?.id) return;
    await supabase
      .from('user_carts')
      .upsert({ user_id: user.id, cart_data: newCart, updated_at: new Date() });
  };

  const getProgressWidth = (order: Order) => {
    if (order.status === 'rejected') return '100%';
    if (order.status === 'delivered') return '100%';
    if (order.status === 'shipped') return '75%';
    if (order.status === 'confirmed') return '45%';
    return '15%';
  };

  const addToCart = (product: Product) => {
    // 🟢 NEW: Custom Project Override
    if (product.id === 32)
      return showToast('Custom Projects require consultation first.', 'error');
    if (product.stock < 1)
      return showToast('Item completely sold out!', 'error');

    const existing = cart.find((item) => item.product.id === product.id);

    if (existing && existing.qty >= product.stock) {
      return showToast(
        `Stock limit reached. Only ${product.stock} available.`,
        'error',
      );
    }

    const newCart = existing
      ? cart.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        )
      : [...cart, { product, qty: 1 }];
    setCart(newCart);
    syncCart(newCart);
    showToast(`Added ${product.name}`, 'success');
  };

  const updateQty = (id: number, delta: number) => {
    const newCart = cart.map((item) => {
      if (item.product.id === id) {
        const newQty = item.qty + delta;
        if (newQty > item.product.stock) {
          showToast(
            `Cannot exceed stock limit (${item.product.stock})`,
            'error',
          );
          return { ...item, qty: item.product.stock };
        }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    });
    setCart(newCart);
    syncCart(newCart);
  };

  const removeFromCart = (id: number) => {
    const newCart = cart.filter((item) => item.product.id !== id);
    setCart(newCart);
    syncCart(newCart);
  };

  const confirmInternalOrder = async () => {
    if (subTotal === 0 || !user) return;
    if (!agreedToTerms)
      return showToast(
        'Security Error: You must accept the Terms and Conditions to proceed.',
        'error',
      );
    if (!receiptFile)
      return showToast(
        'Security Error: Payment receipt screenshot required.',
        'error',
      );

    const cleanUtr = formData.utr.trim();
    if (!/^[0-9]{12}$/.test(cleanUtr))
      return showToast('Security Error: 12-digit UTR is required.', 'error');

    setIsSubmitting(true);

    try {
      const { data: duplicateOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_info->>utr', cleanUtr)
        .maybeSingle();
      if (duplicateOrder) {
        showToast('Fraud Alert: This UTR has already been used!', 'error');
        setIsSubmitting(false);
        return;
      }

      const fileExt = receiptFile.name.split('.').pop();
      const filePath = `receipts/${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, receiptFile);
      if (uploadError)
        throw new Error('Storage Error: Failed to upload receipt.');

      const {
        data: { publicUrl },
      } = supabase.storage.from('payment-receipts').getPublicUrl(filePath);

      const { error } = await supabase.from('orders').insert([
        {
          user_id: user.id,
          items: cart,
          total: grandTotal,
          status: 'pending',
          customer_info: {
            ...formData,
            utr: cleanUtr,
            receipt_url: publicUrl,
            applied_coupon: appliedCoupon,
          },
        },
      ]);

      if (error) throw error;

      const addressToSave = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        pincode: formData.pincode,
      };
      supabase
        .from('profiles')
        .update({ checkout_info: addressToSave })
        .eq('id', user.id)
        .then();

      showToast('Signal Received: Verification in progress.', 'success');
      setCart([]);
      syncCart([]);
      setIsCartOpen(false);
      setIsOrderSummaryOpen(false);
      setReceiptFile(null);
      setAgreedToTerms(false);
      setFormData((prev) => ({ ...prev, utr: '' }));
      switchView('orders');
    } catch (err: any) {
      showToast(err.message || 'Logistics Failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductRating = (productId: number) => {
    const productReviews = allReviews.filter((r) => r.product_id === productId);
    if (productReviews.length === 0) return { avg: 0, count: 0 };
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      avg: Number((sum / productReviews.length).toFixed(1)),
      count: productReviews.length,
    };
  };

  const renderStars = (productId: number) => {
    const { avg, count } = getProductRating(productId);
    if (count === 0) return <div className='h-4 mb-2'></div>;

    const fullStars = Math.floor(avg);
    const hasHalfStar = avg % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className='flex items-center gap-1 text-amber-400 text-[10px] md:text-xs mb-2'>
        <span className='text-white font-bold mr-1'>{avg}</span>
        {[...Array(fullStars)].map((_, i) => (
          <i key={`f-${i}`} className='fas fa-star'></i>
        ))}
        {hasHalfStar && <i className='fas fa-star-half-alt'></i>}
        {[...Array(emptyStars)].map((_, i) => (
          <i key={`e-${i}`} className='far fa-star text-slate-600'></i>
        ))}
        <span className='text-slate-400 ml-1 font-semibold'>({count})</span>
      </div>
    );
  };

  const openProductModal = async (p: Product) => {
    setSelectedProduct(p);
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', p.id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data as Review[]);
  };

  const checkCanReview = (productId: number) => {
    return userOrders.some(
      (order) =>
        order.status === 'delivered' &&
        order.items.some((item) => item.product.id === productId),
    );
  };

  const handleSubmitReview = async () => {
    if (!selectedProduct || !user) return;
    if (reviewForm.rating < 1 || reviewForm.rating > 5)
      return showToast('Invalid rating', 'error');

    setIsSubmittingReview(true);
    try {
      let imageUrl = null;
      if (reviewFile) {
        const fileExt = reviewFile.name.split('.').pop();
        const filePath = `reviews/${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(filePath, reviewFile);
        if (uploadError) throw new Error('Image upload failed');

        const { data } = supabase.storage
          .from('review-images')
          .getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from('reviews').insert([
        {
          product_id: selectedProduct.id,
          user_id: user.id,
          user_name: user.user_metadata?.display_name || 'Anonymous Operator',
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;

      setAllReviews((prev) => [
        ...prev,
        { product_id: selectedProduct.id, rating: reviewForm.rating },
      ]);
      showToast('Review published successfully!', 'success');
      setIsReviewModalOpen(false);
      setReviewForm({ rating: 5, comment: '' });
      setReviewFile(null);
      openProductModal(selectedProduct);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredAndSortedProducts = products
    .filter(
      (p) =>
        (activeCategory === 'all' ||
          p.category.toLowerCase() === activeCategory) &&
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating-desc')
        return getProductRating(b.id).avg - getProductRating(a.id).avg;
      return 0;
    });

  if (isRedirecting)
    return (
      <div className='min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4'>
        <i className='fas fa-shield-alt text-5xl text-amber-500 animate-pulse'></i>
        <p className='text-slate-400 font-bold uppercase tracking-widest text-xs'>
          Redirecting...
        </p>
      </div>
    );
  if (isLoading)
    return (
      <div className='min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4'>
        <i className='fas fa-circle-notch fa-spin text-5xl text-amber-500'></i>
        <p className='text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse'>
          Establishing Connection...
        </p>
      </div>
    );

  return (
    <div className='min-h-screen font-sans bg-[#020617] text-white overflow-x-hidden selection:bg-amber-500/30'>
      <header className='fixed w-full z-50 bg-[#131921] shadow-2xl border-b border-slate-800'>
        <div className='max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-4 md:gap-8'>
          <div className='flex items-center gap-2 md:gap-4 shrink-0'>
            <button
              onClick={() => setIsMenuOpen(true)}
              className='md:hidden text-white text-2xl p-2 active:scale-90'>
              <i className='fas fa-bars'></i>
            </button>
            <div className='cursor-pointer' onClick={() => switchView('shop')}>
              <span className='text-xl md:text-2xl font-black uppercase tracking-tight'>
                Circuit<span className='text-amber-500'>Cart</span>
              </span>
            </div>
          </div>

          <div className='flex-1 max-w-2xl h-10 md:h-11 overflow-hidden rounded-lg focus-within:ring-2 focus-within:ring-amber-500 hidden md:flex shadow-inner'>
            <input
              type='text'
              className='flex-1 px-4 text-slate-900 bg-white outline-none text-sm font-semibold'
              placeholder='Search components, Arduino, tools...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className='bg-amber-500 px-6 text-slate-900 transition-colors hover:bg-amber-600'>
              <i className='fas fa-search'></i>
            </button>
          </div>

          <div className='flex items-center gap-4 md:gap-8 shrink-0 relative'>
            <div
              className='hidden md:block leading-tight cursor-pointer'
              onClick={() => setIsAccountOpen(!isAccountOpen)}>
              <p className='text-[10px] text-slate-400 font-bold uppercase mb-1'>
                Hello, {user?.user_metadata?.display_name || 'Operator'}
              </p>
              <p className='text-sm font-bold uppercase'>
                Account Hub{' '}
                <i className='fas fa-caret-down text-[10px] ml-1'></i>
              </p>
            </div>

            {isAccountOpen && user && (
              <div className='absolute top-16 right-0 w-64 bg-[#131921] border border-slate-700 rounded-xl shadow-2xl p-4 z-[70] animate-pop-in'>
                <button
                  onClick={() => {
                    switchView('orders');
                    setIsAccountOpen(false);
                  }}
                  className='w-full text-left text-sm font-bold p-3 hover:text-amber-500 border-b border-slate-800 flex items-center gap-2'>
                  <i className='fas fa-box text-slate-500'></i> My Orders
                </button>
                <button
                  onClick={() => {
                    setIsSupportOpen(true);
                    setIsAccountOpen(false);
                  }}
                  className='w-full text-left text-sm font-bold p-3 hover:text-amber-500 border-b border-slate-800 flex items-center gap-2'>
                  <i className='fas fa-headset text-slate-500'></i> Support &
                  Help
                </button>
                <button
                  onClick={handleLogout}
                  className='w-full bg-slate-800 text-red-500 font-bold py-2 rounded-lg mt-3 text-xs uppercase hover:bg-slate-700 transition-colors'>
                  Sign Out
                </button>
              </div>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className='relative p-2 active:scale-90 transition-transform'>
              <i className='fas fa-shopping-cart text-2xl text-amber-500'></i>
              {cartCount > 0 && (
                <span className='absolute top-0 right-0 bg-white text-slate-900 font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#131921]'>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className='md:hidden px-4 pb-3'>
          <div className='flex h-10 overflow-hidden rounded-lg shadow-inner'>
            <input
              type='text'
              className='flex-1 px-4 text-slate-900 bg-white outline-none text-sm font-semibold'
              placeholder='Search...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className='bg-amber-500 px-5 text-slate-900'>
              <i className='fas fa-search'></i>
            </button>
          </div>
        </div>

        <div className='hidden md:flex bg-[#232f3e] border-t border-slate-700/50 h-10 items-center justify-center gap-8 text-xs font-bold uppercase tracking-wider relative'>
          {categories.map((cat) => (
            <span
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                switchView('shop');
              }}
              className={`cursor-pointer px-3 py-1 rounded transition-colors ${activeCategory === cat ? 'bg-amber-500 text-slate-900' : 'text-slate-300 hover:text-white'}`}>
              {cat}
            </span>
          ))}
          <div className='absolute right-6 flex items-center'>
            <div className='flex items-center bg-[#020617] border border-slate-700 rounded-lg px-3 py-1.5 focus-within:border-amber-500 transition-all shadow-inner group'>
              <i className='fas fa-sort-amount-down text-amber-500 text-[10px] mr-2'></i>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className='bg-transparent text-white font-bold text-[10px] uppercase tracking-widest outline-none cursor-pointer appearance-none pr-4'>
                <option value='featured' className='bg-[#131921] text-white'>
                  Featured
                </option>
                <option value='price-asc' className='bg-[#131921] text-white'>
                  Price: Low to High
                </option>
                <option value='price-desc' className='bg-[#131921] text-white'>
                  Price: High to Low
                </option>
                <option value='rating-desc' className='bg-[#131921] text-white'>
                  Top Rated
                </option>
              </select>
              <i className='fas fa-chevron-down text-slate-500 group-hover:text-amber-500 transition-colors text-[9px] pointer-events-none -ml-2'></i>
            </div>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className='fixed inset-0 z-[100] flex md:hidden'>
          <div
            className='absolute inset-0 bg-black/80'
            onClick={() => setIsMenuOpen(false)}></div>
          <div className='relative w-[85%] max-w-sm bg-[#131921] h-full shadow-2xl flex flex-col border-r border-slate-800 animate-slide-right will-change-transform'>
            <div className='p-6 bg-[#232f3e] flex items-center gap-4 shrink-0'>
              <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#232f3e] text-2xl'>
                <i className='fas fa-user'></i>
              </div>
              <div>
                <p className='text-sm font-bold uppercase text-white leading-none mb-1'>
                  HELLO,
                </p>
                <p className='text-xl font-bold text-amber-500 line-clamp-1 leading-none'>
                  {user ? user.user_metadata?.display_name : 'Operator'}
                </p>
              </div>
            </div>

            <div className='flex-1 p-6 flex flex-col space-y-6'>
              <div className='flex-1'>
                <h3 className='text-xs font-black uppercase text-slate-400 mb-5 tracking-widest'>
                  Shop By Category
                </h3>
                <ul className='space-y-5'>
                  {categories.map((cat) => (
                    <li
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat);
                        setIsMenuOpen(false);
                        switchView('shop');
                      }}
                      className={`text-base font-bold capitalize cursor-pointer transition-colors ${activeCategory === cat ? 'text-amber-500' : 'text-slate-200'}`}>
                      {cat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className='border-t border-slate-800 pt-6 shrink-0 mb-4'>
                <h3 className='text-xs font-black uppercase text-slate-400 mb-5 tracking-widest'>
                  Settings
                </h3>
                <ul className='space-y-6 text-base font-bold text-slate-200'>
                  <li
                    className='cursor-pointer flex items-center gap-3 hover:text-amber-500 transition-colors'
                    onClick={() => {
                      switchView('orders');
                      setIsMenuOpen(false);
                    }}>
                    <i className='fas fa-box text-slate-400'></i> My Orders
                  </li>
                  <li
                    className='cursor-pointer flex items-center gap-3 hover:text-amber-500 transition-colors'
                    onClick={() => {
                      setIsSupportOpen(true);
                      setIsMenuOpen(false);
                    }}>
                    <i className='fas fa-headset text-slate-400'></i> Support &
                    Help
                  </li>
                  {user && (
                    <li
                      className='text-red-500 cursor-pointer flex items-center gap-3'
                      onClick={handleLogout}>
                      <span className='flex items-center justify-center w-7 h-7 rounded-full border border-red-500 text-xs font-black'>
                        N
                      </span>{' '}
                      Sign Out
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSupportOpen && (
        <div
          className='fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90'
          onClick={() => setIsSupportOpen(false)}>
          <div
            className='bg-[#131921] w-full max-w-sm rounded-2xl p-8 border border-slate-700 shadow-2xl text-center animate-pop-in'
            onClick={(e) => e.stopPropagation()}>
            <i className='fas fa-headset text-5xl text-amber-500 mb-4'></i>
            <h2 className='text-xl font-black uppercase text-white mb-2'>
              Circuit Cart Support
            </h2>
            <p className='text-xs text-slate-400 mb-6 leading-relaxed'>
              Need help with an order, missing components, or payment
              verification? We're here for you.
            </p>
            <div className='bg-[#020617] p-5 rounded-xl border border-slate-800 mb-6'>
              <p className='text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2'>
                Direct Email Line
              </p>
              <a
                href='mailto:circuitcart2025@gmail.com'
                className='text-amber-500 font-bold text-lg hover:underline break-all'>
                circuitcart2025@gmail.com
              </a>
            </div>
            <button
              onClick={() => setIsSupportOpen(false)}
              className='w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shadow-lg'>
              Close Hub
            </button>
          </div>
        </div>
      )}

      <div className='container mx-auto pt-36 md:pt-44 px-4 pb-24 max-w-6xl'>
        {currentView === 'shop' ? (
          <main className='space-y-4 md:space-y-5 animate-pop-in'>
            <div className='md:hidden flex justify-between items-center mb-5 bg-[#131921] p-3 rounded-xl border border-slate-800 shadow-lg'>
              <span className='text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2'>
                <i className='fas fa-filter text-amber-500'></i> Catalog
              </span>
              <div className='flex items-center bg-[#020617] border border-slate-700 rounded-lg px-3 py-1.5 focus-within:border-amber-500 transition-all shadow-inner'>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className='bg-transparent text-white font-bold text-[10px] uppercase tracking-widest outline-none cursor-pointer appearance-none pr-3 relative z-10'>
                  <option value='featured' className='bg-[#131921] text-white'>
                    Featured
                  </option>
                  <option value='price-asc' className='bg-[#131921] text-white'>
                    Price: Low to High
                  </option>
                  <option
                    value='price-desc'
                    className='bg-[#131921] text-white'>
                    Price: High to Low
                  </option>
                  <option
                    value='rating-desc'
                    className='bg-[#131921] text-white'>
                    Top Rated
                  </option>
                </select>
                <i className='fas fa-chevron-down text-amber-500 text-[10px] pointer-events-none -ml-1'></i>
              </div>
            </div>

            {filteredAndSortedProducts.map((p) => (
              <div
                key={p.id}
                className={`bg-slate-900/40 border ${p.stock === 0 && p.id !== 32 ? 'border-red-900/50 opacity-60 grayscale-[0.5]' : 'border-slate-800'} rounded-xl overflow-hidden flex flex-row shadow-lg min-h-[160px] md:min-h-[200px] will-change-transform`}>
                <div
                  className='w-32 md:w-56 bg-slate-800/30 flex items-center justify-center p-4 cursor-pointer shrink-0 relative'
                  onClick={() => openProductModal(p)}>
                  {p.stock === 0 && p.id !== 32 && (
                    <div className='absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest'>
                      Out of Stock
                    </div>
                  )}
                  <img
                    src={p.image}
                    className='max-h-24 md:max-h-36 object-contain blend-image'
                    alt={p.name}
                  />
                </div>
                <div className='flex-1 p-4 md:p-6 flex flex-col justify-between'>
                  <div>
                    <h2
                      className='text-sm md:text-xl font-bold hover:text-amber-500 transition-colors cursor-pointer leading-tight mb-1'
                      onClick={() => openProductModal(p)}>
                      {p.name}
                    </h2>
                    {renderStars(p.id)}
                    <p className='text-xs text-slate-400 line-clamp-2 hidden md:block italic'>
                      {p.desc}
                    </p>
                  </div>
                  <div className='mt-2 flex items-end justify-between'>
                    <div>
                      {/* 🟢 NEW: Custom Project Pricing Display */}
                      {p.id === 32 ? (
                        <div className='flex items-baseline gap-1'>
                          <span className='text-xl md:text-2xl font-black text-amber-500'>
                            Variable
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className='flex items-baseline gap-1'>
                            <span className='text-xs font-bold text-amber-500'>
                              ₹
                            </span>
                            <span className='text-xl md:text-3xl font-black'>
                              {p.price}
                            </span>
                          </div>
                          <p className='text-[10px] text-slate-500 line-through'>
                            M.R.P: ₹{Math.round(p.price * 1.5)}
                          </p>
                        </>
                      )}
                    </div>
                    {/* 🟢 NEW: Custom Project Enquire Button Override */}
                    {p.id === 32 ? (
                      <button
                        onClick={() => openProductModal(p)}
                        className='px-5 md:px-10 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs md:text-sm uppercase tracking-wider active:scale-95 transition-transform shadow-lg'>
                        Enquire
                      </button>
                    ) : p.stock === 0 ? (
                      <button
                        disabled
                        className='px-5 md:px-10 py-2 bg-slate-800 border border-slate-700 text-slate-500 font-bold rounded-lg text-xs md:text-sm uppercase tracking-wider cursor-not-allowed'>
                        Sold Out
                      </button>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className='px-5 md:px-10 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-xs md:text-sm uppercase tracking-wider active:scale-95 transition-transform'>
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </main>
        ) : (
          <div className='animate-pop-in max-w-4xl mx-auto'>
            <div className='flex justify-between items-center mb-10 border-b border-slate-800 pb-6'>
              <h2 className='text-2xl font-black uppercase'>
                Logistics Tracking
              </h2>
              <button
                onClick={() => switchView('shop')}
                className='text-amber-500 font-bold text-sm'>
                ← Back to Shop
              </button>
            </div>

            {userOrders.length === 0 ? (
              <div className='py-20 text-center opacity-30 uppercase font-bold tracking-widest flex flex-col items-center'>
                <i className='fas fa-box-open text-4xl mb-4'></i>No Active
                Shipment Signals
              </div>
            ) : (
              userOrders.map((order) => (
                <div
                  key={order.id}
                  className='bg-[#131921] border border-slate-800 rounded-2xl p-6 mb-8 shadow-2xl will-change-transform'>
                  <div className='flex flex-col md:flex-row justify-between mb-8 text-xs font-bold uppercase gap-4'>
                    <div>
                      <p className='text-slate-500 mb-1'>Manifest ID</p>
                      <p className='font-mono text-slate-300'>
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                    <div>
                      <p className='text-slate-500 mb-1'>Status</p>
                      <p className='text-amber-500'>{order.status}</p>
                    </div>
                    <div className='md:text-right'>
                      <p className='text-slate-500 mb-1'>Est. Arrival</p>
                      <p className='text-green-500'>
                        {order.delivery_date
                          ? new Date(order.delivery_date).toDateString()
                          : 'Pending Confirmation'}
                      </p>
                    </div>
                  </div>
                  <div className='relative h-2.5 bg-slate-800 rounded-full mb-4 overflow-hidden border border-slate-700/50'>
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-1000 ${order.status === 'rejected' ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'}`}
                      style={{ width: getProgressWidth(order) }}></div>
                  </div>
                  <div className='flex justify-between text-[9px] md:text-[10px] font-black uppercase text-slate-500 px-1 tracking-tighter'>
                    {order.status === 'rejected' ? (
                      <span className='text-red-500 w-full text-center animate-pulse'>
                        Security Alert: Order Terminated / Payment Verification
                        Failed
                      </span>
                    ) : (
                      <>
                        <span
                          className={
                            order.status === 'pending' ? 'text-green-500' : ''
                          }>
                          Dispatched
                        </span>
                        <span
                          className={
                            order.status === 'confirmed' ? 'text-green-500' : ''
                          }>
                          Verified
                        </span>
                        <span
                          className={
                            order.status === 'shipped' ? 'text-green-500' : ''
                          }>
                          In Transit
                        </span>
                        <span
                          className={
                            order.status === 'delivered' ? 'text-green-500' : ''
                          }>
                          Arrived
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {isOrderSummaryOpen && (
        <div
          className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90'
          onClick={() => setIsOrderSummaryOpen(false)}>
          <div
            className='bg-[#131921] w-full max-w-lg rounded-3xl p-6 md:p-10 border border-slate-700 shadow-2xl animate-pop-in custom-scroll max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-6 md:mb-8'>
              <h2 className='text-xl md:text-2xl font-black uppercase tracking-tighter'>
                Secure Checkout
              </h2>
              <button
                onClick={() => setIsOrderSummaryOpen(false)}
                className='w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors'>
                <i className='fas fa-times'></i>
              </button>
            </div>

            {checkoutStep === 'cart' ? (
              <div className='space-y-6 md:space-y-8'>
                <div className='bg-[#020617] p-5 rounded-2xl border border-slate-800 shadow-inner'>
                  <div className='flex justify-between text-sm font-bold mb-3'>
                    <span className='text-slate-400 uppercase tracking-wider'>
                      Payload ({cartCount} Items)
                    </span>
                    <span>₹{subTotal}</span>
                  </div>
                  <div className='flex justify-between text-sm font-bold mb-3'>
                    <span className='text-slate-400 uppercase tracking-wider'>
                      Platform Core Fee
                    </span>
                    <span>₹{platformFee}</span>
                  </div>
                  <div className='flex justify-between text-sm font-bold mb-5'>
                    <span className='text-slate-400 uppercase tracking-wider'>
                      Logistics Fee
                    </span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className='flex justify-between text-sm font-bold mb-5 text-green-500'>
                      <span className='uppercase tracking-wider'>
                        Voucher Applied
                      </span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className='flex justify-between text-xl md:text-3xl font-black text-amber-500 border-t border-slate-800 pt-5'>
                    <span className='uppercase tracking-wider'>
                      Final Target
                    </span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>

                <div className='flex gap-2'>
                  <input
                    type='text'
                    placeholder='PROMO CODE'
                    className='flex-1 bg-[#020617] border border-slate-700 rounded-xl px-4 font-bold text-sm uppercase outline-none focus:border-amber-500'
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={!!appliedCoupon}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={!!appliedCoupon}
                    className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors ${appliedCoupon ? 'bg-green-500/20 text-green-500' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                    {appliedCoupon ? 'Active' : 'Deploy'}
                  </button>
                </div>

                <div className='bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3'>
                  <i className='fas fa-shield-alt text-amber-500 mt-1 text-lg'></i>
                  <p className='text-[10px] md:text-xs text-slate-300 font-bold uppercase tracking-widest leading-relaxed'>
                    Encrypted Transaction Protocol Active. Initiating secure
                    routing sequence.
                  </p>
                </div>

                <button
                  onClick={() => setCheckoutStep('form')}
                  className='w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl text-sm uppercase tracking-widest transition-transform active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]'>
                  Initiate Operator Info
                </button>
              </div>
            ) : (
              <div className='space-y-6'>
                <div
                  className='flex items-center gap-3 mb-6 text-amber-500 cursor-pointer'
                  onClick={() => setCheckoutStep('cart')}>
                  <i className='fas fa-arrow-left'></i>
                  <span className='text-xs font-bold uppercase tracking-widest'>
                    Back to Bill
                  </span>
                </div>
                <input
                  type='text'
                  required
                  placeholder='Operator Name'
                  className='w-full p-4 bg-[#020617] border border-slate-700 rounded-xl outline-none focus:border-amber-500 transition-colors text-sm font-bold'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <input
                  type='tel'
                  required
                  placeholder='Comms Number (10 Digits)'
                  className='w-full p-4 bg-[#020617] border border-slate-700 rounded-xl outline-none focus:border-amber-500 transition-colors text-sm font-bold'
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  maxLength={10}
                />
                <textarea
                  required
                  placeholder='Delivery Coordinates'
                  className='w-full p-4 bg-[#020617] border border-slate-700 rounded-xl outline-none focus:border-amber-500 transition-colors h-24 resize-none text-sm font-bold'
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
                <input
                  type='text'
                  required
                  placeholder='Sector Pincode'
                  className='w-full p-4 bg-[#020617] border border-slate-700 rounded-xl outline-none focus:border-amber-500 transition-colors text-sm font-bold mb-4'
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pincode: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  maxLength={6}
                />

                <div className='bg-[#020617] p-6 rounded-2xl border border-slate-700 text-center relative overflow-hidden'>
                  <div className='absolute top-0 left-0 w-full h-1 bg-amber-500'></div>
                  <h3 className='text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4'>
                    Step 1: Scan & Transfer ₹{grandTotal}
                  </h3>
                  <div className='bg-white p-2 rounded-xl inline-block mb-4 shadow-lg'>
                    <img
                      src={dynamicQrUrl}
                      alt='Dynamic UPI QR Code'
                      className='w-32 h-32 md:w-40 md:h-40'
                    />
                  </div>
                  <div className='bg-[#131921] px-4 py-3 rounded-lg border border-slate-800 flex items-center justify-between mb-4'>
                    <span className='font-mono font-bold text-sm md:text-base text-amber-500 tracking-wider'>
                      9547543695@axl
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('9547543695@axl');
                        showToast('UPI ID Copied', 'success');
                      }}
                      className='text-slate-400 hover:text-white'>
                      <i className='fas fa-copy'></i>
                    </button>
                  </div>
                  <a
                    href={upiLink}
                    className='block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest mb-6'>
                    Pay via UPI App
                  </a>
                </div>

                <div className='pt-5 border-t border-slate-700/50 text-left'>
                  <label className='block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3'>
                    Step 2: Upload Payment Evidence
                  </label>
                  <label className='relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group overflow-hidden'>
                    {receiptFile ? (
                      <div className='flex flex-col items-center animate-pop-in'>
                        <i className='fas fa-check-circle text-green-500 text-2xl mb-2'></i>
                        <p className='text-xs font-bold text-white uppercase px-4 truncate max-w-full'>
                          {receiptFile.name}
                        </p>
                        <p className='text-[9px] text-slate-500 mt-1 uppercase tracking-widest'>
                          Tap to Re-upload
                        </p>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center text-slate-500 group-hover:text-amber-500 transition-colors'>
                        <i className='fas fa-camera text-3xl mb-2'></i>
                        <p className='text-[10px] font-black uppercase tracking-widest'>
                          Attach Receipt Screenshot
                        </p>
                      </div>
                    )}
                    <input
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={(e) =>
                        setReceiptFile(
                          e.target.files ? e.target.files[0] : null,
                        )
                      }
                    />
                  </label>
                  <div className='mt-6'>
                    <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2'>
                      Verify 12-Digit UTR Number
                    </label>
                    <input
                      type='text'
                      maxLength={12}
                      placeholder='0000 0000 0000'
                      className='w-full p-4 bg-[#020617] border border-slate-700 rounded-xl text-white font-mono font-black text-lg outline-none focus:border-amber-500 transition-all tracking-[0.2em] placeholder:tracking-normal'
                      value={formData.utr}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          utr: e.target.value.replace(/[^0-9]/g, ''),
                        })
                      }
                    />
                  </div>
                </div>

                <label className='flex items-start gap-3 mt-4 mb-2 cursor-pointer group'>
                  <div className='relative flex items-center justify-center w-5 h-5 mt-0.5 rounded border border-slate-600 group-hover:border-amber-500 transition-colors bg-[#020617] shrink-0'>
                    <input
                      type='checkbox'
                      className='absolute opacity-0 w-full h-full cursor-pointer'
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    {agreedToTerms && (
                      <i className='fas fa-check text-[10px] text-amber-500'></i>
                    )}
                  </div>
                  <p className='text-[10px] text-slate-400 leading-relaxed font-semibold'>
                    I verify this payment is accurate and agree to the{' '}
                    <span className='text-amber-500 hover:underline'>
                      Terms of Service
                    </span>{' '}
                    and{' '}
                    <span className='text-amber-500 hover:underline'>
                      Return Policy
                    </span>
                    .
                  </p>
                </label>

                <button
                  onClick={confirmInternalOrder}
                  disabled={isSubmitting}
                  className='w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-slate-900 font-black rounded-xl text-sm uppercase tracking-widest shadow-xl flex justify-center items-center gap-3 transition-transform active:scale-95'>
                  {isSubmitting ? (
                    <>
                      <i className='fas fa-circle-notch fa-spin'></i>{' '}
                      Transmitting
                    </>
                  ) : (
                    'Confirm Transfer & Dispatch'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className='fixed inset-0 z-[100] flex justify-end'>
          <div
            className='absolute inset-0 bg-black/80'
            onClick={() => setIsCartOpen(false)}></div>
          <div className='relative w-full max-w-md bg-[#131921] h-full shadow-2xl flex flex-col border-l border-slate-800 animate-slide-left will-change-transform'>
            <div className='flex justify-between items-center p-6 border-b border-slate-800 bg-[#232f3e] shrink-0'>
              <h2 className='text-xl font-black uppercase text-amber-500 tracking-wider'>
                <i className='fas fa-microchip mr-3'></i>Payload
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className='w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-red-500 transition-colors'>
                <i className='fas fa-times'></i>
              </button>
            </div>

            <div className='flex-1 overflow-y-auto p-6 space-y-6 custom-scroll'>
              {cart.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center text-slate-500 opacity-50'>
                  <i className='fas fa-box-open text-6xl mb-4'></i>
                  <p className='text-xs font-bold uppercase tracking-widest'>
                    Payload Empty
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className='flex gap-5 bg-[#020617] p-4 rounded-xl border border-slate-800 relative'>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] transition-colors'>
                      <i className='fas fa-times'></i>
                    </button>
                    <div className='w-20 h-20 bg-slate-800/50 rounded-lg flex items-center justify-center p-2 shrink-0'>
                      <img
                        src={item.product.image}
                        className='max-h-full object-contain blend-image'
                      />
                    </div>
                    <div className='flex-1 flex flex-col justify-between'>
                      <div>
                        <h3 className='font-bold text-sm leading-tight text-white line-clamp-2 mb-1'>
                          {item.product.name}
                        </h3>
                        <p className='text-amber-500 font-black'>
                          ₹{item.product.price}
                        </p>
                      </div>
                      <div className='flex items-center gap-4 mt-2'>
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className='w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs'>
                          <i className='fas fa-minus'></i>
                        </button>
                        <span className='font-bold text-sm w-4 text-center'>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className='w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs'>
                          <i className='fas fa-plus'></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className='p-6 border-t border-slate-800 bg-[#020617] shrink-0'>
                <div className='flex justify-between items-end mb-6'>
                  <span className='text-xs font-bold uppercase text-slate-400 tracking-widest'>
                    Subtotal
                  </span>
                  <span className='text-3xl font-black text-amber-500'>
                    ₹{subTotal}
                  </span>
                </div>
                {subTotal < MIN_ORDER_VALUE ? (
                  <div className='bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center'>
                    <i className='fas fa-exclamation-triangle text-red-500 text-2xl mb-2'></i>
                    <p className='text-[10px] font-bold uppercase text-red-400 tracking-wider'>
                      Minimum payload requirement: ₹{MIN_ORDER_VALUE}
                    </p>
                    <p className='text-xs font-black text-white mt-1'>
                      Add ₹{MIN_ORDER_VALUE - subTotal} more to proceed
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsOrderSummaryOpen(true);
                    }}
                    className='w-full py-5 bg-green-500 hover:bg-green-600 text-slate-900 font-black rounded-xl text-sm uppercase tracking-widest transition-transform active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.3)]'>
                    Authorize Checkout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isReviewModalOpen && selectedProduct && (
        <div
          className='fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90'
          onClick={() => setIsReviewModalOpen(false)}>
          <div
            className='bg-[#131921] w-full max-w-md rounded-2xl p-6 md:p-8 border border-slate-700 shadow-2xl animate-pop-in'
            onClick={(e) => e.stopPropagation()}>
            <h2 className='text-xl font-black uppercase text-white mb-6 border-b border-slate-800 pb-4'>
              Rate Your Experience
            </h2>
            <div className='flex gap-2 mb-6 justify-center'>
              {[1, 2, 3, 4, 5].map((star) => (
                <i
                  key={star}
                  className={`fas fa-star text-3xl cursor-pointer transition-colors ${reviewForm.rating >= star ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-slate-700'}`}
                  onClick={() =>
                    setReviewForm({ ...reviewForm, rating: star })
                  }></i>
              ))}
            </div>
            <textarea
              placeholder='How did this component perform in your project?'
              className='w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:border-amber-500 h-28 mb-4 resize-none'
              value={reviewForm.comment}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, comment: e.target.value })
              }
            />
            <label className='flex items-center justify-center gap-3 w-full border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 p-4 rounded-xl cursor-pointer transition-all mb-6'>
              <i
                className={`fas ${reviewFile ? 'fa-check-circle text-green-500' : 'fa-camera text-slate-500'} text-xl`}></i>
              <span
                className={`text-xs font-bold uppercase ${reviewFile ? 'text-white' : 'text-slate-400'}`}>
                {reviewFile
                  ? 'Photo Attached'
                  : 'Upload Project Photo (Optional)'}
              </span>
              <input
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(e) =>
                  setReviewFile(e.target.files ? e.target.files[0] : null)
                }
              />
            </label>
            <div className='flex gap-3'>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className='flex-1 py-3 text-slate-400 font-bold uppercase text-xs border border-slate-700 rounded-xl hover:bg-slate-800'>
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className='flex-[2] py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-slate-900 font-bold uppercase text-xs rounded-xl shadow-lg flex items-center justify-center gap-2'>
                {isSubmittingReview ? (
                  <>
                    <i className='fas fa-spinner fa-spin'></i> Submitting
                  </>
                ) : (
                  'Publish Review'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && !isReviewModalOpen && (
        <div
          className='fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80'
          onClick={() => setSelectedProduct(null)}>
          <div
            className='bg-[#131921] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-slate-700 animate-pop-in will-change-transform'
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedProduct(null)}
              className='absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors'>
              <i className='fas fa-times'></i>
            </button>

            <div className='md:w-1/2 bg-[#020617] p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-700 relative'>
              {/* 🟢 NEW: Out of Stock Badge skips Custom Project */}
              {selectedProduct.stock === 0 && selectedProduct.id !== 32 && (
                <div className='absolute top-6 left-6 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded uppercase tracking-widest shadow-xl'>
                  Out of Stock
                </div>
              )}
              <img
                src={selectedProduct.image}
                className='max-h-52 md:max-h-72 object-contain blend-image'
              />
            </div>

            <div className='md:w-1/2 p-6 md:p-8 flex flex-col max-h-[80vh]'>
              <div className='shrink-0 mb-4 border-b border-slate-800 pb-4'>
                <span className='text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1 block'>
                  {selectedProduct.category}
                </span>
                <h2 className='text-xl md:text-2xl font-black text-white leading-tight mb-2'>
                  {selectedProduct.name}
                </h2>
                {renderStars(selectedProduct.id)}

                {/* 🟢 NEW: Price Label Override */}
                {selectedProduct.id === 32 ? (
                  <p className='text-amber-500 text-2xl font-black mt-2'>
                    Variable
                  </p>
                ) : (
                  <p className='text-amber-500 text-2xl font-black mt-2'>
                    ₹{selectedProduct.price}
                  </p>
                )}
              </div>

              <div className='flex-1 overflow-y-auto custom-scroll pr-2 mb-6 space-y-6'>
                <div className='bg-slate-900/50 p-4 rounded-xl border border-slate-800'>
                  <p className='text-xs text-slate-300 leading-relaxed whitespace-pre-line font-medium'>
                    {selectedProduct.details || selectedProduct.desc}
                  </p>
                </div>

                <div className='bg-slate-900/30 p-4 rounded-xl border border-slate-800/50'>
                  <div className='flex justify-between items-end mb-4 border-b border-slate-800/50 pb-3'>
                    <h3 className='text-xs font-black uppercase text-amber-500 tracking-widest'>
                      <i className='fas fa-star mr-2'></i>Field Tests & Reviews
                    </h3>
                    {checkCanReview(selectedProduct.id) && (
                      <button
                        onClick={() => setIsReviewModalOpen(true)}
                        className='text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded uppercase tracking-wider transition-colors'>
                        Write Review
                      </button>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <div className='text-center py-6 text-slate-500 border border-dashed border-slate-700 rounded-lg'>
                      <i className='fas fa-comment-slash text-2xl mb-2'></i>
                      <p className='text-[10px] font-bold uppercase tracking-widest'>
                        No field data recorded yet.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className='bg-[#020617] p-4 rounded-xl border border-slate-800'>
                          <div className='flex justify-between items-start mb-2'>
                            <span className='text-xs font-black text-white uppercase'>
                              {r.user_name}
                            </span>
                            <div className='text-amber-500 text-[9px] flex gap-0.5'>
                              {[...Array(5)].map((_, i) => (
                                <i
                                  key={i}
                                  className={`fas fa-star ${i < r.rating ? '' : 'text-slate-700'}`}></i>
                              ))}
                            </div>
                          </div>
                          {r.comment && (
                            <p className='text-xs text-slate-400 italic leading-relaxed mb-3'>
                              "{r.comment}"
                            </p>
                          )}
                          {r.image_url && (
                            <img
                              src={r.image_url}
                              alt='User project'
                              className='w-16 h-16 object-cover rounded-lg border border-slate-700 cursor-pointer hover:border-amber-500 transition-colors'
                              onClick={() => window.open(r.image_url, '_blank')}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 🟢 NEW: Custom Project Override on Modal Buttons */}
              <div className='mt-auto pt-4 shrink-0 border-t border-slate-800'>
                {selectedProduct.id === 32 ? (
                  <div className='space-y-3 mt-4'>
                    <p className='text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] text-center mb-2'>
                      Special Request Protocol
                    </p>
                    <a
                      href={`https://wa.me/919547543695?text=${encodeURIComponent(`Hello Circuit Cart! I am interested in a Custom Project. Here is my idea: `)}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-sm uppercase tracking-widest transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3'>
                      <i className='fab fa-whatsapp text-lg'></i> Discuss on
                      WhatsApp
                    </a>
                    <a
                      href='mailto:circuitcart2025@gmail.com?subject=Custom%20Project%20Inquiry'
                      onClick={() => setSelectedProduct(null)}
                      className='w-full py-3 bg-transparent border border-slate-700 text-slate-400 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors block text-center'>
                      Contact Support via Email
                    </a>
                  </div>
                ) : selectedProduct.stock === 0 ? (
                  <button
                    disabled
                    className='w-full py-4 bg-slate-800 text-slate-500 font-black rounded-xl text-sm uppercase tracking-widest cursor-not-allowed border border-slate-700 mt-4'>
                    Inventory Depleted
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className='w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl text-sm uppercase tracking-widest transition-transform active:scale-95 shadow-xl shrink-0 mt-4'>
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-lg shadow-2xl ${toast.type === 'success' ? 'bg-amber-500 text-slate-900' : 'bg-red-600 text-white'} font-bold animate-pop-in text-sm flex items-center gap-2`}>
          <i className='fas fa-check-circle text-lg'></i> {toast.msg}
        </div>
      )}

      <style jsx global>{`
        .blend-image {
          mix-blend-mode: screen;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
        }
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .animate-pop-in {
          animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-left {
          animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideLeft {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-slide-right {
          animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideRight {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
