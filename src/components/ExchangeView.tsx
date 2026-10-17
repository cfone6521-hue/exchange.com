import React, { useState, useEffect } from 'react';
import { MarketTicker } from '../wallet/types';
import { TrendingUp, TrendingDown, Clock, Info, ShieldAlert, ArrowUpDown } from 'lucide-react';

interface ExchangeViewProps {
  lang: 'pt' | 'en';
}

export const ExchangeView: React.FC<ExchangeViewProps> = ({ lang }) => {
  const [selectedPair, setSelectedPair] = useState<string>('ETHUSDT');
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [orderbook, setOrderbook] = useState<{ bids: [number, number][]; asks: [number, number][] }>({
    bids: [],
    asks: [],
  });
  const [candles, setCandles] = useState<any[]>([]);
  const [chartInterval, setChartInterval] = useState<'1h' | '4h' | '1d'>('1h');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [orderPrice, setOrderPrice] = useState<string>('');
  const [orderAmount, setOrderAmount] = useState<string>('');
  const [orders, setOrders] = useState<any[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<any | null>(null);

  const t = {
    pt: {
      pairs: 'Pares de Negociação',
      orderbook: 'Livro de Ofertas',
      chart: 'Gráfico de Preços em Tempo Real',
      placeOrder: 'Boletim de Ordens',
      buy: 'Comprar',
      sell: 'Vender',
      limit: 'Limite',
      market: 'Mercado',
      price: 'Preço (USDT)',
      amount: 'Quantidade',
      total: 'Total Estimado',
      high24h: 'Máxima 24h',
      low24h: 'Mínima 24h',
      volume24h: 'Volume 24h',
      change24h: 'Variação 24h',
      sandboxNoticeTitle: 'Modo Demonstrativo de Negociação Ativo',
      sandboxNoticeDesc: 'As cotações e o livro de ofertas são reais e obtidos da API pública da Binance. As ordens neste terminal operam em sandbox até que uma corretora ou motor de custódia off-chain seja conectado.',
      btnSubmitBuy: 'Comprar',
      btnSubmitSell: 'Vender',
      recentOrders: 'Ordens em Aberto & Histórico',
      noOrders: 'Nenhuma ordem no sandbox de negociação.',
      feeText: 'Taxa de Negociação Maker/Taker: 0.10%',
      priceCol: 'Preço (USDT)',
      qtyCol: 'Quantidade',
      totalCol: 'Total',
    },
    en: {
      pairs: 'Trading Pairs',
      orderbook: 'Orderbook Depth',
      chart: 'Real-Time Price Chart',
      placeOrder: 'Order Entry',
      buy: 'Buy',
      sell: 'Sell',
      limit: 'Limit',
      market: 'Market',
      price: 'Price (USDT)',
      amount: 'Amount',
      total: 'Estimated Total',
      high24h: '24h High',
      low24h: '24h Low',
      volume24h: '24h Volume',
      change24h: '24h Change',
      sandboxNoticeTitle: 'Demonstration Trading Mode Active',
      sandboxNoticeDesc: 'Price tickers and orderbook depth are real-time from the Binance public API. Order execution runs in a demonstration sandbox until exchange API keys or off-chain matching engines are attached.',
      btnSubmitBuy: 'Buy',
      btnSubmitSell: 'Sell',
      recentOrders: 'Open Orders & History',
      noOrders: 'No orders placed in trading sandbox.',
      feeText: 'Maker/Taker Trading Fee: 0.10%',
      priceCol: 'Price (USDT)',
      qtyCol: 'Amount',
      totalCol: 'Total',
    },
  }[lang];

  // Fetch tickers
  useEffect(() => {
    const fetchTickers = () => {
      fetch('/api/market/tickers')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setTickers(json.data);
          }
        })
        .catch(() => {});
    };
    fetchTickers();
    const timer = setInterval(fetchTickers, 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orderbook for selected pair
  useEffect(() => {
    const fetchDepth = () => {
      fetch(`/api/market/depth?symbol=${selectedPair}&limit=12`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setOrderbook({ bids: json.bids || [], asks: json.asks || [] });
          }
        })
        .catch(() => {});
    };
    fetchDepth();
    const timer = setInterval(fetchDepth, 5000);
    return () => clearInterval(timer);
  }, [selectedPair]);

  // Fetch candles for selected pair
  useEffect(() => {
    fetch(`/api/market/candles?symbol=${selectedPair}&interval=${chartInterval}&limit=40`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCandles(json.data);
        }
      })
      .catch(() => {});
  }, [selectedPair, chartInterval]);

  const activeTicker = tickers.find((t) => t.symbol === selectedPair) || tickers[0];

  useEffect(() => {
    if (activeTicker && !orderPrice) {
      setOrderPrice(activeTicker.price.toFixed(2));
    }
  }, [activeTicker, selectedPair]);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderAmount || parseFloat(orderAmount) <= 0) return;

    const price = orderType === 'market' ? activeTicker.price : parseFloat(orderPrice) || activeTicker.price;
    const amount = parseFloat(orderAmount);
    const total = price * amount;

    const newOrder = {
      id: 'ord_' + Math.random().toString(36).substring(2, 8),
      symbol: selectedPair,
      side: orderSide,
      type: orderType,
      price,
      amount,
      total,
      status: 'sandbox_filled',
      timestamp: Date.now(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setOrderAmount('');
  };

  // Render SVG interactive price chart
  const minPrice = candles.length ? Math.min(...candles.map((c) => c.low)) : 0;
  const maxPrice = candles.length ? Math.max(...candles.map((c) => c.high)) : 1;
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="space-y-4">
      {/* Top Ticker Summary Bar */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Pair Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedPair}
                onChange={(e) => {
                  setSelectedPair(e.target.value);
                  setOrderPrice('');
                }}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-['Outfit'] text-base font-bold text-white focus:border-cyan-500 focus:outline-none"
              >
                {tickers.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.base}/{t.quote}
                  </option>
                ))}
              </select>
            </div>

            {activeTicker && (
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  ${activeTicker.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold font-mono ${
                    activeTicker.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeTicker.change24h >= 0 ? '+' : ''}
                  {activeTicker.change24h.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {activeTicker && (
            <div className="hidden sm:flex items-center gap-6 text-xs font-mono">
              <div>
                <div className="text-slate-500 text-[11px]">{t.high24h}</div>
                <div className="text-slate-200">${activeTicker.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">{t.low24h}</div>
                <div className="text-slate-200">${activeTicker.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[11px]">{t.volume24h}</div>
                <div className="text-slate-200">${Math.round(activeTicker.volume24h).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Trading Terminal: Chart (center), Orderbook (right top), Order Form (right bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart Column (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-[#0c121e] p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="font-['Outfit'] text-sm font-bold text-white">{t.chart}</h3>
              <span className="text-[11px] text-cyan-400 font-mono">Binance API Feed</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg">
              {(['1h', '4h', '1d'] as const).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setChartInterval(interval)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    chartInterval === interval
                      ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {interval.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Candle Details Tooltip */}
          <div className="h-6 flex items-center gap-4 text-[11px] font-mono text-slate-400 mt-2">
            {hoveredCandle ? (
              <>
                <span>O: <span className="text-slate-200">{hoveredCandle.open.toFixed(2)}</span></span>
                <span>H: <span className="text-slate-200">{hoveredCandle.high.toFixed(2)}</span></span>
                <span>L: <span className="text-slate-200">{hoveredCandle.low.toFixed(2)}</span></span>
                <span>C: <span className="text-slate-200">{hoveredCandle.close.toFixed(2)}</span></span>
              </>
            ) : candles.length > 0 ? (
              <>
                <span>Abertura: <span className="text-slate-200">{candles[candles.length - 1]?.open.toFixed(2)}</span></span>
                <span>Último: <span className="text-slate-200">{candles[candles.length - 1]?.close.toFixed(2)}</span></span>
              </>
            ) : null}
          </div>

          {/* SVG Candlestick Graphic */}
          <div className="mt-2 h-72 w-full relative">
            {candles.length > 0 ? (
              <svg className="w-full h-full" viewBox="0 0 800 280" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal price guide lines */}
                {[0.25, 0.5, 0.75].map((ratio) => {
                  const y = ratio * 280;
                  const price = maxPrice - ratio * priceRange;
                  return (
                    <g key={ratio}>
                      <line x1="0" y1={y} x2="800" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x="790" y={y - 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                        ${price.toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {/* Candlesticks */}
                {candles.map((candle, idx) => {
                  const width = 800 / candles.length;
                  const x = idx * width + width * 0.15;
                  const candleWidth = width * 0.7;

                  const yOpen = 280 - ((candle.open - minPrice) / priceRange) * 260 - 10;
                  const yClose = 280 - ((candle.close - minPrice) / priceRange) * 260 - 10;
                  const yHigh = 280 - ((candle.high - minPrice) / priceRange) * 260 - 10;
                  const yLow = 280 - ((candle.low - minPrice) / priceRange) * 260 - 10;

                  const isGreen = candle.close >= candle.open;
                  const color = isGreen ? '#34d399' : '#f87171';
                  const topY = Math.min(yOpen, yClose);
                  const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

                  return (
                    <g
                      key={candle.time || idx}
                      onMouseEnter={() => setHoveredCandle(candle)}
                      onMouseLeave={() => setHoveredCandle(null)}
                      className="cursor-crosshair"
                    >
                      {/* Wick */}
                      <line x1={x + candleWidth / 2} y1={yHigh} x2={x + candleWidth / 2} y2={yLow} stroke={color} strokeWidth="1.2" />
                      {/* Body */}
                      <rect
                        x={x}
                        y={topY}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={color}
                        rx="1"
                      />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                Carregando dados históricos do mercado...
              </div>
            )}
          </div>

          {/* Demonstration Notice */}
          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-400">{t.sandboxNoticeTitle}: </span>
              <span className="text-slate-400">{t.sandboxNoticeDesc}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Orderbook & Order Form (1 col) */}
        <div className="space-y-4">
          {/* Orderbook Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-['Outfit'] font-bold text-white text-xs">{t.orderbook}</h3>
              <span className="text-[10px] text-slate-500">{selectedPair}</span>
            </div>

            <div className="mt-2 grid grid-cols-2 text-[10px] text-slate-500 pb-1">
              <span>{t.priceCol}</span>
              <span className="text-right">{t.qtyCol}</span>
            </div>

            {/* Asks (Sell orders - red) */}
            <div className="space-y-0.5 max-h-28 overflow-hidden">
              {orderbook.asks.slice(0, 5).reverse().map(([p, q], i) => (
                <div key={i} className="flex justify-between text-rose-400 py-0.5 hover:bg-rose-500/10 px-1 rounded">
                  <span>{p.toFixed(2)}</span>
                  <span className="text-slate-400 text-right">{q.toFixed(4)}</span>
                </div>
              ))}
            </div>

            {/* Spread center */}
            <div className="my-1.5 py-1 px-1 bg-slate-900 rounded text-center text-[11px] font-bold text-cyan-400">
              ${activeTicker ? activeTicker.price.toFixed(2) : '---'}
            </div>

            {/* Bids (Buy orders - green) */}
            <div className="space-y-0.5 max-h-28 overflow-hidden">
              {orderbook.bids.slice(0, 5).map(([p, q], i) => (
                <div key={i} className="flex justify-between text-emerald-400 py-0.5 hover:bg-emerald-500/10 px-1 rounded">
                  <span>{p.toFixed(2)}</span>
                  <span className="text-slate-400 text-right">{q.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Entry Form */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-4 text-xs">
            <h3 className="font-['Outfit'] font-bold text-white text-xs mb-3">{t.placeOrder}</h3>

            {/* Buy / Sell Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setOrderSide('buy')}
                className={`py-1.5 rounded-lg font-semibold transition-colors ${
                  orderSide === 'buy' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.buy}
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('sell')}
                className={`py-1.5 rounded-lg font-semibold transition-colors ${
                  orderSide === 'sell' ? 'bg-rose-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.sell}
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-3">
              {/* Limit / Market Switch */}
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Tipo de Ordem:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('limit')}
                    className={`font-semibold ${orderType === 'limit' ? 'text-cyan-400 underline' : 'text-slate-500'}`}
                  >
                    {t.limit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('market')}
                    className={`font-semibold ${orderType === 'market' ? 'text-cyan-400 underline' : 'text-slate-500'}`}
                  >
                    {t.market}
                  </button>
                </div>
              </div>

              {orderType === 'limit' && (
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">{t.price}</label>
                  <input
                    type="number"
                    step="any"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  {t.amount} ({activeTicker?.base})
                </label>
                <input
                  type="number"
                  step="any"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="pt-1 text-[11px] text-slate-400 flex justify-between">
                <span>{t.total}:</span>
                <span className="font-mono text-white font-semibold">
                  $
                  {(
                    (orderType === 'market' ? activeTicker.price : parseFloat(orderPrice) || 0) *
                    (parseFloat(orderAmount) || 0)
                  ).toFixed(2)}{' '}
                  USDT
                </span>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl font-bold transition-all text-slate-950 shadow-sm ${
                  orderSide === 'buy'
                    ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                    : 'bg-rose-400 hover:bg-rose-300 shadow-rose-500/20'
                }`}
              >
                {orderSide === 'buy' ? t.btnSubmitBuy : t.btnSubmitSell} {activeTicker?.base}
              </button>

              <div className="text-[10px] text-slate-500 text-center">{t.feeText}</div>
            </form>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-5">
        <h3 className="font-['Outfit'] text-sm font-bold text-white mb-3">{t.recentOrders}</h3>
        {orders.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">{t.noOrders}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">Par</th>
                  <th className="pb-2 font-semibold">Lado</th>
                  <th className="pb-2 font-semibold">Tipo</th>
                  <th className="pb-2 text-right font-semibold">Preço</th>
                  <th className="pb-2 text-right font-semibold">Quantidade</th>
                  <th className="pb-2 text-right font-semibold">Total (USDT)</th>
                  <th className="pb-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-900/30">
                    <td className="py-2.5 font-bold text-white">{ord.symbol}</td>
                    <td className={`py-2.5 font-semibold ${ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ord.side.toUpperCase()}
                    </td>
                    <td className="py-2.5 text-slate-400 uppercase">{ord.type}</td>
                    <td className="py-2.5 text-right text-slate-200">${ord.price.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-slate-200">{ord.amount}</td>
                    <td className="py-2.5 text-right font-semibold text-white">${ord.total.toFixed(2)}</td>
                    <td className="py-2.5 text-right">
                      <span className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        Simulada (Sandbox)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
