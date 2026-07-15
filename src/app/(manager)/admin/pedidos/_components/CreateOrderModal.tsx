"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import { MdQrCodeScanner } from "react-icons/md";
import BarcodeScannerModal from "@/components/modals/BarcodeScannerModal";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
  stores: any[];
}

interface OrderItem {
  productId: string;
  variationId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  color?: string;
  size?: string;
  storeId: string;
  storeName?: string;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
  stores,
}: CreateOrderModalProps) {
  const [step, setStep] = useState<"customer" | "items" | "review">("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [products, setProducts] = useState<any[]>([]);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderSource, setOrderSource] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [foundCustomers, setFoundCustomers] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(true);
  const [shippingType, setShippingType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [selectedPickupStore, setSelectedPickupStore] = useState<any>(null);

  // Shipping
  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "México",
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentRefNumber, setPaymentRefNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  const [selectedSourceStore, setSelectedSourceStore] = useState<any>(null);
  const [storeInventoryData, setStoreInventoryData] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const customerSearchTimer = useRef<NodeJS.Timeout | null>(null);

  // Search customers
  useEffect(() => {
    if (customerSearchTimer.current) {
      clearTimeout(customerSearchTimer.current);
    }

    if (!searchCustomer.trim()) {
      setFoundCustomers([]);
      return;
    }

    customerSearchTimer.current = setTimeout(async () => {
      setIsSearchingCustomer(true);
      try {
        const keyword = encodeURIComponent(searchCustomer.trim());
        const res = await fetch(`/api/clients?search=${keyword}&limit=10`);
        const data = await res.json();
        const clients = Array.isArray(data) ? data : data.clients || [];
        setFoundCustomers(clients);
      } catch (error) {
        console.error("Error searching customers:", error);
        setFoundCustomers([]);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 300);

    return () => {
      if (customerSearchTimer.current) {
        clearTimeout(customerSearchTimer.current);
      }
    };
  }, [searchCustomer]);
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchProduct);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchProduct]);

  // Search products via backend API
  useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedSearch.trim()) {
        setProducts([]);
        return;
      }

      setIsSearching(true);
      try {
        const keyword = encodeURIComponent(debouncedSearch.trim());
        let url = `/api/products/products-in-stock?keyword=${keyword}&limit=20`;

        const res = await fetch(url);
        const data = await res.json();
        const productList = Array.isArray(data)
          ? data
          : data.products?.products || [];
        console.log("Fetched products:", productList);
        console.log(
          "Product variations:",
          productList.map((p: any) => ({
            title: p.title,
            id: p._id,
            variationsCount: p.variations?.length,
            variationStocks: p.variations?.map((v: any) => v.stock),
          })),
        );

        // Backend already filters by StoreInventory, so no need to filter again
        const productsWithStock = Array.isArray(productList) ? productList : [];
        console.log(
          "Products after frontend filter:",
          productsWithStock.length,
        );

        setProducts(productsWithStock);
      } catch (error) {
        console.error("Error searching products:", error);
        setProducts([]);
      } finally {
        setIsSearching(false);
      }
    };

    if (isOpen) {
      searchProducts();
    }
  }, [debouncedSearch, isOpen]);

  const filteredProducts = Array.isArray(products) ? products : [];

  const addItem = () => {
    if (
      !selectedProduct ||
      !selectedVariation ||
      !selectedSourceStore ||
      itemQuantity < 1
    ) {
      setError("Selecciona producto, rama de origen y cantidad válida");
      return;
    }

    if (selectedSourceStore.storeStock < itemQuantity) {
      setError(
        `Stock insuficiente en ${selectedSourceStore.storeName}. Disponible: ${selectedSourceStore.storeStock}`,
      );
      return;
    }

    const newItem: OrderItem = {
      productId: selectedProduct._id,
      variationId: selectedVariation._id,
      title:
        `${selectedProduct.title} ${selectedVariation.color || ""} ${selectedVariation.size || ""}`.trim(),
      price:
        selectedVariation.price ||
        selectedVariation.salePrice ||
        selectedProduct.price ||
        selectedProduct.variations?.[0]?.price ||
        0,
      quantity: itemQuantity,
      image: selectedProduct.images?.[0]?.url || "",
      color: selectedVariation.color,
      size: selectedVariation.size,
      storeId: selectedSourceStore.storeId,
      storeName: selectedSourceStore.storeName,
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProduct(null);
    setSelectedVariation(null);
    setSelectedSourceStore(null);
    setStoreInventoryData(null);
    setSearchProduct("");
    setError("");
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  };

  const handleCreateOrder = async () => {
    if (
      !customerName?.trim() ||
      !customerEmail?.trim() ||
      !orderSource?.trim() ||
      !orderItems.length
    ) {
      const missingFields = [];
      if (!customerName?.trim()) missingFields.push("cliente");
      if (!customerEmail?.trim()) missingFields.push("email");
      if (!orderSource?.trim()) missingFields.push("origen");
      if (!orderItems.length) missingFields.push("productos");

      setError(`Completa los campos requeridos: ${missingFields.join(", ")}`);
      return;
    }

    // Validate pickup store selection if pickup is selected
    if (shippingType === "pickup" && !selectedPickupStore) {
      setError("Debes seleccionar una sucursal para recoger la orden");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          items: orderItems,
          shippingAddress: shippingType === "pickup" ? null : shippingAddress,
          shippingType,
          pickupStore: shippingType === "pickup" ? selectedPickupStore : null,
          paymentMethod,
          paymentRefNumber,
          notes,
          orderSource: orderSource,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear la orden");
      }

      setSuccessMessage(`Orden ${data.order.orderNumber} creada exitosamente`);
      setTimeout(() => {
        resetForm();
        onOrderCreated();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("customer");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setOrderSource("");
    setSearchCustomer("");
    setFoundCustomers([]);
    setShowNewCustomerForm(true);
    setShippingType("delivery");
    setSelectedPickupStore(null);
    setShippingAddress({
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "México",
    });
    setPaymentMethod("transferencia");
    setPaymentRefNumber("");
    setNotes("");
    setOrderItems([]);
    setSearchProduct("");
    setSelectedProduct(null);
    setSelectedVariation(null);
    setSelectedSourceStore(null);
    setStoreInventoryData(null);
    setItemQuantity(1);
    setError("");
    setSuccessMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700 h-full">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between border-b border-blue-500">
          <div>
            <h2 className="text-2xl font-bold">Crear Nuevo Pedido</h2>
            <p className="text-blue-100 mt-1 text-lg">
              Paso{" "}
              <span className="font-bold">
                {step === "customer"
                  ? "1 Información del Cliente"
                  : step === "items"
                    ? "2 Agregar Productos"
                    : "3 Revisar Pedido"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-blue-800 p-2 rounded-lg transition"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMessage ? (
            <div className="bg-green-900/50 border border-green-500 text-green-100 p-4 rounded-xl text-center">
              <p className="font-semibold text-lg">{successMessage}</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-100 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {/* Step Tabs */}
              <div className="flex gap-2 mb-6">
                {["customer", "items", "review"].map((s, idx) => (
                  <button
                    key={s}
                    onClick={() => setStep(s as any)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      step === s
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    {idx + 1}.{" "}
                    {s === "customer"
                      ? "Cliente"
                      : s === "items"
                        ? "Productos"
                        : "Revisar"}
                  </button>
                ))}
              </div>

              {/* Customer Info Step */}
              {step === "customer" && (
                <div className="space-y-4">
                  {/* Origin selection */}
                  <div className="space-y-2">
                    <select
                      value={orderSource}
                      onChange={(e) => setOrderSource(e.target.value)}
                      className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white"
                    >
                      <option value="">Selecciona origen</option>
                      <option value="Manual">Manual</option>
                      <option value="Redes">Redes Sociales</option>
                    </select>
                  </div>
                  {/* Customer Search */}
                  <div className="relative">
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      Buscar Cliente Existente
                    </label>
                    <input
                      type="text"
                      value={searchCustomer}
                      onChange={(e) => setSearchCustomer(e.target.value)}
                      className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400"
                      placeholder="Buscar por nombre, email o teléfono..."
                    />

                    {/* Customer Dropdown */}
                    {searchCustomer && (
                      <div className="absolute top-full left-0 right-0 mt-2 border border-slate-600 rounded-lg max-h-56 overflow-y-auto bg-slate-800 shadow-2xl z-10">
                        {isSearchingCustomer ? (
                          <div className="p-4 text-center text-gray-400 text-sm">
                            Buscando clientes...
                          </div>
                        ) : foundCustomers.length > 0 ? (
                          foundCustomers.map((customer) => (
                            <button
                              key={customer._id}
                              onClick={() => {
                                setCustomerName(customer.name || "");
                                setCustomerEmail(customer.email || "");
                                setCustomerPhone(customer.phone || "");
                                setSearchCustomer("");
                                setFoundCustomers([]);
                                setShowNewCustomerForm(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-b-0 transition"
                            >
                              <div className="font-semibold text-sm text-white">
                                {customer.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {customer.email}
                                {customer.phone && ` · ${customer.phone}`}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4">
                            <div className="text-xs text-gray-400 text-center mb-3">
                              Cliente no encontrado
                            </div>
                            <button
                              onClick={() => {
                                setShowNewCustomerForm(true);
                                setSearchCustomer("");
                                setFoundCustomers([]);
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold transition"
                            >
                              Crear Nuevo Cliente
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Show form if no customer selected or creating new */}
                  {showNewCustomerForm && (
                    <>
                      <div className="flex gap-4 lg:flex-row flex-col">
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400"
                          placeholder="Nombre del cliente"
                        />
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400"
                          placeholder="email@example.com"
                        />
                      </div>

                      <div className="flex gap-4 lg:flex-row flex-col">
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400"
                          placeholder="555 456 7890"
                        />
                      </div>
                    </>
                  )}

                  {/* Display selected customer info */}
                  {!showNewCustomerForm && customerName && (
                    <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                      <div className="text-sm text-green-400 mb-2">
                        ✓ Cliente seleccionado:
                      </div>
                      <div className="text-white font-semibold">
                        {customerName}
                      </div>
                      <div className="text-sm text-gray-300">
                        {customerEmail}
                        {customerPhone && ` · ${customerPhone}`}
                      </div>
                      <button
                        onClick={() => {
                          setShowNewCustomerForm(true);
                          setCustomerName("");
                          setCustomerEmail("");
                          setCustomerPhone("");
                          setSearchCustomer("");
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                      >
                        Usar cliente diferente
                      </button>
                    </div>
                  )}

                  {/* Shipping Type Selection */}
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">
                      Tipo de Entrega *
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShippingType("delivery")}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition border-2 ${
                          shippingType === "delivery"
                            ? "border-blue-500 bg-blue-600/20 text-blue-100"
                            : "border-slate-600 bg-slate-700 text-gray-300 hover:border-blue-400"
                        }`}
                      >
                        📦 Envío a Domicilio
                      </button>
                      <button
                        onClick={() => setShippingType("pickup")}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition border-2 ${
                          shippingType === "pickup"
                            ? "border-green-500 bg-green-600/20 text-green-100"
                            : "border-slate-600 bg-slate-700 text-gray-300 hover:border-green-400"
                        }`}
                      >
                        🏪 Recoger en Sucursal
                      </button>
                    </div>
                  </div>

                  {/* Address Fields - Only show for delivery */}
                  {shippingType === "delivery" && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">
                          Dirección *
                        </label>
                        <input
                          type="text"
                          value={shippingAddress.address}
                          onChange={(e) =>
                            setShippingAddress({
                              ...shippingAddress,
                              address: e.target.value,
                            })
                          }
                          className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400"
                          placeholder="Calle y número"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={shippingAddress.city}
                          onChange={(e) =>
                            setShippingAddress({
                              ...shippingAddress,
                              city: e.target.value,
                            })
                          }
                          className="border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400 text-sm"
                          placeholder="Ciudad"
                        />
                        <input
                          type="text"
                          value={shippingAddress.postalCode}
                          onChange={(e) =>
                            setShippingAddress({
                              ...shippingAddress,
                              postalCode: e.target.value,
                            })
                          }
                          className="border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400 text-sm"
                          placeholder="Código Postal"
                        />
                      </div>
                    </>
                  )}

                  {/* Pickup Info */}
                  {shippingType === "pickup" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-3 text-gray-300">
                          Selecciona Sucursal de Recogida *
                        </label>
                        <div className="flex lg:flex-row flex-col gap-3 space-y-2 max-h-48 overflow-y-auto border border-slate-600 rounded-lg p-3 bg-slate-600/40">
                          {stores && stores.length > 0 ? (
                            stores.map((store: any) => (
                              <button
                                key={store._id}
                                onClick={() => setSelectedPickupStore(store)}
                                className={`w-full px-4 py-3 rounded-lg border-2 text-left transition ${
                                  selectedPickupStore?._id === store._id
                                    ? "border-green-500 bg-green-600/20 text-green-100"
                                    : "border-slate-600 bg-slate-600 text-gray-100 hover:border-green-400"
                                }`}
                              >
                                <div>🏪</div>
                                <div className="font-semibold text-xs text-white">
                                  {store.name}
                                </div>
                                <div className="text-xs text-gray-300 mt-1">
                                  {store.address || "Sin dirección"}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="text-xs text-gray-400 text-center py-4">
                              No hay sucursales disponibles
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedPickupStore && (
                        <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                          <div className="text-sm text-green-400 mb-2">
                            ✓ Recogida confirmada en:
                          </div>
                          <div className="font-semibold text-white">
                            {selectedPickupStore.name}
                          </div>
                          <div className="text-sm text-gray-300">
                            {selectedPickupStore.address ||
                              "Sin dirección especificada"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setStep("items")}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
                  >
                    Continuar a Productos
                  </button>
                </div>
              )}

              {/* Items Step */}
              {step === "items" && (
                <div className="space-y-4">
                  {/* Product Search */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchProduct}
                        onChange={(e) => setSearchProduct(e.target.value)}
                        className="flex-1 border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400"
                        placeholder="Buscar por nombre o ASIN..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
                        title="Escanear código de barras/QR"
                      >
                        <MdQrCodeScanner size={20} />
                      </button>
                    </div>

                    {/* Product Dropdown */}
                    {debouncedSearch && (
                      <div className="absolute top-full left-0 right-0 mt-2 border border-slate-600 rounded-lg max-h-64 overflow-y-auto bg-slate-800 shadow-2xl z-10">
                        {isSearching ? (
                          <div className="p-4 text-center text-gray-400 text-sm">
                            Buscando productos...
                          </div>
                        ) : filteredProducts.length > 0 ? (
                          filteredProducts.slice(0, 10).map((p) => (
                            <button
                              key={p._id}
                              onClick={() => {
                                setSelectedProduct(p);
                                setSearchProduct("");
                                setDebouncedSearch("");
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-b-0 transition flex items-center gap-3"
                            >
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-600">
                                {p.images?.[0]?.url && (
                                  <Image
                                    src={p.images[0].url}
                                    alt={p.title}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-white truncate">
                                  {p.title}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {p.ASIN && `ASIN: ${p.ASIN} · `}
                                  {p.storeInventoryTotal || 0} unidades en stock
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-400 text-sm">
                            No se encontraron productos
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Product Preview */}
                  {selectedProduct && (
                    <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-600">
                          {selectedProduct.images?.[0]?.url && (
                            <Image
                              src={selectedProduct.images[0].url}
                              alt={selectedProduct.title}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">
                            {selectedProduct.title}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {selectedProduct.ASIN &&
                              `ASIN: ${selectedProduct.ASIN}`}
                          </p>
                          <button
                            onClick={() => {
                              setSelectedProduct(null);
                              setSelectedVariation(null);
                              setItemQuantity(1);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 mt-2"
                          >
                            Cambiar producto
                          </button>
                        </div>
                      </div>

                      {/* Variations - Show available variations */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">
                          Variación Disponible *
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedProduct.variations &&
                          selectedProduct.variations.length > 0 ? (
                            selectedProduct.variations.map((v: any) => (
                              <button
                                key={v._id}
                                onClick={() => {
                                  console.log("Selected variation:", v);
                                  setSelectedVariation(v);
                                  // Fetch store inventory for this variation
                                  const fetchStoreInventory = async () => {
                                    try {
                                      console.log(
                                        "Fetching store inventory for product:",
                                        selectedProduct._id,
                                        "variation:",
                                        v._id,
                                      );
                                      const res = await fetch(
                                        `/api/store-inventory?productId=${selectedProduct._id}`,
                                      );
                                      const data = await res.json();
                                      console.log(
                                        "Store inventory response:",
                                        data,
                                      );
                                      if (Array.isArray(data)) {
                                        const variantRecords = data.filter(
                                          (inv: any) =>
                                            inv.variationId ===
                                            v._id.toString(),
                                        );
                                        console.log(
                                          "Filtered variant records:",
                                          variantRecords,
                                        );
                                        setStoreInventoryData(variantRecords);
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Error fetching store inventory:",
                                        err,
                                      );
                                      setStoreInventoryData([]);
                                    }
                                  };
                                  fetchStoreInventory();
                                }}
                                className={`w-full px-4 py-3 rounded-lg border-2 text-left transition ${
                                  selectedVariation?._id === v._id
                                    ? "border-blue-500 bg-blue-600/20 text-blue-100"
                                    : "border-slate-600 bg-slate-600 text-gray-100 hover:border-blue-400"
                                }`}
                              >
                                <div className="text-sm font-semibold text-white">
                                  {v.color && `Color: ${v.color}`}{" "}
                                  {v.size && `Talla: ${v.size}`}
                                </div>
                                <div className="text-xs text-gray-300 mt-1">
                                  Selecciona Sucursal
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="text-xs text-gray-400 text-center py-3">
                              No hay variaciones disponibles
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Store Inventory Display */}
                      {selectedVariation && (
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-300">
                            Seleccionar Sucursal de Origen *
                          </label>
                          {storeInventoryData ? (
                            <div className="flex lg:flex-row flex-col gap-3 max-h-48 overflow-y-auto border border-slate-600 rounded-lg p-3 bg-slate-600/40">
                              {storeInventoryData.length > 0 ? (
                                storeInventoryData.map((inv: any) => (
                                  <button
                                    key={`${inv.store._id}-${inv.variationId}`}
                                    onClick={() => {
                                      setSelectedSourceStore({
                                        storeId: inv.store._id,
                                        storeName: inv.store.name,
                                        storeStock: inv.quantity,
                                      });
                                    }}
                                    disabled={inv.quantity === 0}
                                    className={`w-fit px-4 py-3 rounded-lg border-2 text-left transition ${
                                      selectedSourceStore?.storeId ===
                                      inv.store._id
                                        ? "border-green-500 bg-green-600/20 text-green-100"
                                        : inv.quantity === 0
                                          ? "border-gray-600 bg-gray-700 text-gray-400 opacity-50 cursor-not-allowed"
                                          : "border-slate-500 bg-slate-600 text-gray-100 hover:border-green-400"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="font-semibold text-sm">
                                          {inv.store.name}
                                        </div>
                                        <div className="text-xs text-gray-300 mt-1">
                                          Stock disponible:{" "}
                                          {inv.quantity > 0 && (
                                            <span className="text-base font-bold text-green-400">
                                              {inv.quantity}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="text-xs text-gray-400 text-center py-3">
                                  Sin inventario registrado en sucursales para
                                  esta variación
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 text-center py-3">
                              Cargando inventario...
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">
                          Cantidad *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) =>
                            setItemQuantity(parseInt(e.target.value) || 1)
                          }
                          className="w-full border border-slate-600 rounded-lg px-4 py-2 outline-none focus:border-blue-500 bg-slate-600 text-white"
                        />
                      </div>

                      <button
                        onClick={addItem}
                        className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        <FaPlus size={16} /> Agregar a la Orden
                      </button>
                    </div>
                  )}

                  {/* Items List */}
                  {orderItems.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="font-bold text-sm text-gray-300">
                        Productos en la orden ({orderItems.length}):
                      </h4>
                      {orderItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 bg-slate-700 p-3 rounded-lg border border-slate-600"
                        >
                          {/* Product Image */}
                          {item.image && (
                            <button
                              onClick={() => {
                                setSelectedImageUrl(item.image);
                                setShowImageModal(true);
                              }}
                              className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-600 hover:opacity-80 transition cursor-pointer"
                            >
                              <Image
                                src={item.image}
                                alt={item.title}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-gray-400">
                              Sucursal: {item.storeName} · $
                              {(item.price || 0).toFixed(2)} x {item.quantity} =
                              ${((item.price || 0) * item.quantity).toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-red-400 hover:text-red-300 p-2 flex-shrink-0"
                          >
                            <FaTrash size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setStep("customer")}
                      className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={() => setStep("review")}
                      disabled={orderItems.length === 0}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      Continuar a Revisar
                    </button>
                  </div>
                </div>
              )}

              {/* Review Step */}
              {step === "review" && (
                <div className="space-y-4">
                  <div className="bg-slate-700 p-5 rounded-xl space-y-4 border border-slate-600">
                    <div className="flex lg:flex-row flex-col gap-4">
                      {/* Client Info */}
                      <div className="w-full">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">
                          Origen: {orderSource}
                        </div>
                        <div className="font-bold text-white text-lg">
                          {customerName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {customerEmail}
                          {customerPhone && ` · ${customerPhone}`}
                        </div>
                      </div>

                      {/* Shipping Info */}
                      <div className="w-full">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                          {shippingType === "delivery"
                            ? "Envío a Domicilio"
                            : "Recoger en Sucursal"}
                        </div>
                        {shippingType === "delivery" ? (
                          <div className="text-sm text-gray-300">
                            {shippingAddress.address}
                            <br />
                            {shippingAddress.city}, {shippingAddress.postalCode}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-sm text-green-400 font-semibold">
                              🏪{" "}
                              {selectedPickupStore?.name ||
                                "Sucursal no seleccionada"}
                            </div>
                            {selectedPickupStore?.address && (
                              <div className="text-xs text-gray-400">
                                {selectedPickupStore.address}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="border-t border-slate-600 pt-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                        Productos ({orderItems.length})
                      </div>
                      <div className="gap-3 flex flex-wrap">
                        {orderItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-sm bg-slate-600/50 p-3 rounded space-y-1"
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-white text-sm font-semibold flex-1">
                                {item.title.substring(0, 17)}
                                {/* {item.title.length > 17 && "..."} */}
                              </span>
                              <span className="text-green-400 font-semibold ml-2">
                                $
                                {((item.price || 0) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Sucursal: {item.storeName}</span>
                              <span>
                                {item.quantity}x ${(item.price || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex lg:flex-row flex-col gap-4">
                      {/* Total */}
                      <div className="w-full border-t border-slate-600 pt-4 flex justify-between items-center bg-blue-900/30 p-4 rounded-lg">
                        <span className="font-bold text-white">
                          Total a Pagar
                        </span>
                        <span className="text-2xl font-bold text-green-400">
                          ${getTotalAmount().toFixed(2)}
                        </span>
                      </div>
                      {/* Payment Method */}
                      <div className="w-full">
                        <label className="block text-sm font-semibold mb-2 text-gray-300">
                          Método de Pago
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white"
                        >
                          <option value="tarjeta">Tarjeta</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="efectivo">Efectivo</option>
                        </select>
                      </div>
                    </div>

                    {/* Payment Reference Number */}
                    {(paymentMethod === "tarjeta" ||
                      paymentMethod === "transferencia") && (
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">
                          {paymentMethod === "tarjeta"
                            ? "Número de Referencia (Autorización)"
                            : "Número de Referencia (Transferencia)"}
                        </label>
                        <input
                          type="text"
                          value={paymentRefNumber}
                          onChange={(e) => setPaymentRefNumber(e.target.value)}
                          className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400"
                          placeholder={
                            paymentMethod === "tarjeta"
                              ? "Ej: AUTH123456789"
                              : "Ej: REF-2024-001"
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border border-slate-600 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-slate-700 text-white placeholder-gray-400 resize-none"
                      rows={2}
                      placeholder="Notas adicionales..."
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setStep("items")}
                      className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleCreateOrder}
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {loading ? "Creando..." : "Crear Orden"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-slate-800 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg z-10"
            >
              <FaTimes size={20} />
            </button>
            <div className="relative w-full h-full flex items-center justify-center bg-black/50">
              <Image
                src={selectedImageUrl}
                alt="Producto"
                width={800}
                height={800}
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScannerModal
          onScan={(value) => {
            setSearchProduct(value);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
