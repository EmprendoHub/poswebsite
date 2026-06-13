"use client";
import { CartItem } from "./ProductSearch";
import { MdDelete, MdAdd, MdRemove, MdReceiptLong } from "react-icons/md";

interface POSCartProps {
  items: CartItem[];
  onUpdateQty: (variationId: string, delta: number) => void;
  onRemove: (variationId: string) => void;
  onCheckout: () => void;
  customerName: string;
  customerPhone: string;
  onCustomerNameChange: (v: string) => void;
  onCustomerPhoneChange: (v: string) => void;
  disabled?: boolean;
}

export default function POSCart({
  items,
  onUpdateQty,
  onRemove,
  onCheckout,
  customerName,
  customerPhone,
  onCustomerNameChange,
  onCustomerPhoneChange,
  disabled,
}: POSCartProps) {
  const rawSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const iva = Math.round(((rawSubtotal * 16) / 116) * 100) / 100;

  return (
    <div className="flex flex-col h-full bg-card dark:bg-gradient-to-br dark:from-slate-700 dark:to-slate-900 border border-muted rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-muted flex items-center gap-2">
        <MdReceiptLong size={20} className="text-emerald-500" />
        <h2 className="font-semibold text-sm">Carrito de Venta</h2>
        <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
          {items.length} art.
        </span>
      </div>

      {/* Customer */}
      <div className="px-4 py-3 border-b border-muted grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          className="col-span-2 text-xs bg-muted rounded-md px-3 py-2 outline-none placeholder:text-muted-foreground text-foreground"
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
        {items.length === 0 && (
          <p className="text-center text-muted-foreground text-xs mt-10">
            Agrega productos desde la búsqueda
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.variationId}
            className="flex items-start gap-3 py-2 border-b border-muted last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-tight truncate">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  ${item.price.toFixed(2)} x {item.quantity}
                </p>

                <span className="text-[10px] font-semibold text-amber-400 leading-none">
                  máx. {item.stock}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onUpdateQty(item.variationId, -1)}
                className="w-6 h-6 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
              >
                <MdRemove size={12} />
              </button>
              <span className="text-xs w-5 text-center font-bold">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQty(item.variationId, 1)}
                disabled={item.quantity >= item.stock}
                className="w-6 h-6 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MdAdd size={12} />
              </button>
              <button
                onClick={() => onRemove(item.variationId)}
                className="ml-1 w-6 h-6 rounded-full hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
              >
                <MdDelete size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-muted">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">${rawSubtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs mb-4">
          <span className="text-muted-foreground">IVA incluido (16%)</span>
          <span className="text-muted-foreground">${iva.toFixed(2)}</span>
        </div>
        <button
          disabled={items.length === 0 || disabled}
          onClick={onCheckout}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          Cobrar
        </button>
      </div>
    </div>
  );
}
