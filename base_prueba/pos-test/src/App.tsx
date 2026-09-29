import { useState, useMemo } from 'react';
import inventoryData from './inventory.json';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus,
  CreditCard,
  Banknote,
  Receipt
} from 'lucide-react';

interface Product {
  Código: string;
  Producto: string;
  'P. Costo': string;
  'P. Venta': string;
  'P. Mayoreo': string;
  Departamento: string;
  Existencia: string;
  'Inv. Mínimo': string;
  'Inv. Máximo': string;
  'Tipo de Venta': string;
}

interface CartItem extends Product {
  quantity: number;
}

const formatPrice = (priceStr: string) => {
  if (!priceStr) return 0;
  return parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState<string>('All');

  const products: Product[] = inventoryData as Product[];

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.Departamento).filter(Boolean));
    return ['All', ...Array.from(cats)].slice(0, 15); // limit categories for UI
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.Producto?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.Código?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === 'All' || p.Departamento === category;
      return matchesSearch && matchesCategory;
    }).slice(0, 50); // limit to 50 for performance
  }, [products, searchTerm, category]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.Código === product.Código);
      if (existing) {
        return prev.map(item => 
          item.Código === product.Código 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (code: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.Código === code) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      });
    });
  };

  const removeFromCart = (code: string) => {
    setCart(prev => prev.filter(item => item.Código !== code));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + (formatPrice(item['P. Venta']) * item.quantity);
    }, 0);
  }, [cart]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Main Content (Products) */}
      <div className="flex-1 flex flex-col h-full bg-slate-100/50">
        <header className="bg-white p-4 shadow-sm z-10 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              S
            </div>
            <h1 className="text-xl font-bold text-slate-800">Synco POS<span className="text-blue-500 font-medium">.Test</span></h1>
          </div>
          
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por código o producto..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* Categories */}
        <div className="overflow-x-auto py-3 px-4 bg-white border-b border-slate-200 hide-scrollbar flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === '- Sin Departamento -' ? 'Generales' : cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.Código} 
                  onClick={() => addToCart(product)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all active:scale-95 group flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs text-slate-400 mb-1 font-mono">{product.Código}</div>
                    <h3 className="font-semibold text-sm leading-tight text-slate-700 group-hover:text-blue-600 line-clamp-2">
                      {product.Producto}
                    </h3>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="text-blue-600 font-bold">
                      {product['P. Venta']}
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Stock: {product.Existencia}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] z-20">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg">Orden Actual</h2>
          </div>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-md font-bold">
            {cart.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.Código} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center justify-between gap-3 group hover:border-blue-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate text-slate-700">{item.Producto}</h4>
                  <div className="text-blue-600 text-sm font-bold mt-0.5">
                    {formatCurrency(formatPrice(item['P. Venta']) * item.quantity)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                  <button 
                    onClick={() => updateQuantity(item.Código, -1)}
                    className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.Código, 1)}
                    className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.Código)}
                  className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Impuestos (0%)</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-slate-800 pt-2 border-t border-slate-200 mt-2">
              <span>Total</span>
              <span className="text-blue-600">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl font-medium hover:bg-slate-50 hover:border-blue-200 transition-all">
              <Banknote className="w-4 h-4" />
              Efectivo
            </button>
            <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl font-medium hover:bg-slate-50 hover:border-blue-200 transition-all">
              <CreditCard className="w-4 h-4" />
              Tarjeta
            </button>
          </div>

          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            disabled={cart.length === 0}
            onClick={() => {
              alert(`Cobrando ${formatCurrency(cartTotal)}`);
              setCart([]);
            }}
          >
            <Receipt className="w-5 h-5" />
            Cobrar Total
          </button>
        </div>
      </div>
    </div>
  );
}
