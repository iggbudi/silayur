"use client";

import { FormEvent, useState } from "react";
import type {
  TicketDayType,
  TicketPrice,
  TicketProduct,
} from "../../shared/config";
import { todayIsoDate } from "../../shared/date";
import { Toggle } from "./toggle";

type ProductDraft = Pick<
  TicketProduct,
  "code" | "name" | "description" | "validityMode"
>;

type PriceDraft = Omit<TicketPrice, "price"> & { price: string };

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function categoryLabel(product: TicketProduct): string {
  return product.visitorCategory === "child" ? "Anak" : "Dewasa";
}

function validityLabel(product: TicketProduct): string {
  return product.validityMode === "same_day"
    ? "Hanya tanggal transaksi"
    : "Tanggal kunjungan dipilih petugas";
}

function dayLabel(dayType: TicketDayType): string {
  return dayType === "weekday" ? "Weekday" : "Weekend & hari libur";
}

function newPriceDraft(productId: string): PriceDraft {
  return {
    id: `price-${crypto.randomUUID()}`,
    ticketProductId: productId,
    dayType: "weekday",
    price: "",
    validFrom: todayIsoDate(),
    validUntil: null,
    active: true,
  };
}

export function TicketSettings({
  products,
  canManage,
  onSave,
}: {
  products: TicketProduct[];
  canManage: boolean;
  onSave: (products: TicketProduct[]) => Promise<void>;
}) {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [priceDraft, setPriceDraft] = useState<PriceDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function commit(next: TicketProduct[]) {
    setSaving(true);
    setError("");
    try {
      await onSave(next);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Gagal menyimpan master tiket.",
      );
      throw caught;
    } finally {
      setSaving(false);
    }
  }

  function beginProductEdit(product: TicketProduct) {
    setEditingProductId(product.id);
    setProductDraft({
      code: product.code,
      name: product.name,
      description: product.description,
      validityMode: product.validityMode,
    });
    setPriceDraft(null);
    setError("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProductId || !productDraft) return;
    if (!productDraft.code.trim() || !productDraft.name.trim()) {
      setError("Kode dan nama tiket wajib diisi.");
      return;
    }
    const next = products.map((product) =>
      product.id === editingProductId
        ? {
            ...product,
            code: productDraft.code.trim().toUpperCase(),
            name: productDraft.name.trim(),
            description: productDraft.description.trim(),
            validityMode: productDraft.validityMode,
          }
        : product,
    );
    try {
      await commit(next);
      setEditingProductId(null);
      setProductDraft(null);
    } catch {
      // Error is rendered in this component.
    }
  }

  async function toggleProduct(product: TicketProduct) {
    try {
      await commit(
        products.map((item) =>
          item.id === product.id ? { ...item, active: !item.active } : item,
        ),
      );
    } catch {
      // Parent data remains the server-confirmed snapshot.
    }
  }

  function beginPriceEdit(price: TicketPrice) {
    setPriceDraft({
      ...price,
      price: String(price.price),
    });
    setEditingProductId(null);
    setProductDraft(null);
    setError("");
  }

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceDraft) return;
    const amount = Number(priceDraft.price);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Harga wajib berupa Rupiah lebih dari nol.");
      return;
    }
    if (!priceDraft.validFrom) {
      setError("Tanggal mulai tarif wajib diisi.");
      return;
    }
    if (
      priceDraft.validUntil &&
      priceDraft.validUntil < priceDraft.validFrom
    ) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      return;
    }

    const normalized: TicketPrice = {
      ...priceDraft,
      price: amount,
      validUntil: priceDraft.validUntil || null,
    };
    const next = products.map((product) => {
      if (product.id !== normalized.ticketProductId) return product;
      const exists = product.prices.some((price) => price.id === normalized.id);
      return {
        ...product,
        prices: exists
          ? product.prices.map((price) =>
              price.id === normalized.id ? normalized : price,
            )
          : [...product.prices, normalized],
      };
    });

    try {
      await commit(next);
      setPriceDraft(null);
    } catch {
      // Error is rendered in this component.
    }
  }

  async function togglePrice(price: TicketPrice) {
    const next = products.map((product) => ({
      ...product,
      prices: product.prices.map((item) =>
        item.id === price.id ? { ...item, active: !item.active } : item,
      ),
    }));
    try {
      await commit(next);
    } catch {
      // Parent data remains the server-confirmed snapshot.
    }
  }

  if (products.length === 0) {
    return (
      <div className="ticket-master-empty">
        <strong>Master tiket belum tersedia</strong>
        <p>Jalankan migration dan seed Checkpoint 11 terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="ticket-master">
      <div className="ticket-policy-note">
        <span>Aturan tiket masuk</span>
        <p>
          Anak adalah pengunjung di bawah 12 tahun dan dipilih manual oleh
          petugas. Hari libur menggunakan tarif weekend. Tanggal kunjungan tidak
          dapat diubah setelah transaksi selesai.
        </p>
      </div>

      {error ? (
        <p className="ticket-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="ticket-product-list">
        {products.map((product) => (
          <article
            className={`ticket-product-card ${
              product.active
                ? "ticket-product-active"
                : "ticket-product-inactive"
            }`}
            key={product.id}
          >
            <header className="ticket-product-header">
              <div>
                <div className="ticket-product-labels">
                  <span>{categoryLabel(product)}</span>
                  <code>{product.code}</code>
                  <small
                    className={
                      product.active
                        ? "ticket-status-active"
                        : "ticket-status-inactive"
                    }
                  >
                    <i aria-hidden="true" />
                    {product.active ? "Aktif" : "Nonaktif"}
                  </small>
                </div>
                <h3>{product.name}</h3>
                <p>{product.description || "Belum ada keterangan."}</p>
                <b>{validityLabel(product)}</b>
              </div>
              <div className="ticket-product-actions">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => beginProductEdit(product)}
                  >
                    Edit tiket
                  </button>
                ) : null}
                <Toggle
                  active={product.active}
                  label={product.name}
                  disabled={!canManage || saving}
                  onChange={() => void toggleProduct(product)}
                />
              </div>
            </header>

            {editingProductId === product.id && productDraft ? (
              <form className="ticket-product-form" onSubmit={saveProduct}>
                <label>
                  <span>Kode tiket</span>
                  <input
                    value={productDraft.code}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        code: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>Nama tiket</span>
                  <input
                    value={productDraft.name}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        name: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="ticket-form-wide">
                  <span>Keterangan</span>
                  <input
                    value={productDraft.description}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        description: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>Masa berlaku</span>
                  <select
                    value={productDraft.validityMode}
                    onChange={(event) =>
                      setProductDraft({
                        ...productDraft,
                        validityMode: event.target.value as ProductDraft["validityMode"],
                      })
                    }
                  >
                    <option value="same_day">Hanya hari transaksi</option>
                    <option value="selected_date">Tanggal dipilih petugas</option>
                  </select>
                </label>
                <div className="ticket-form-actions">
                  <button type="submit" disabled={saving}>
                    {saving ? "Menyimpan…" : "Simpan tiket"}
                  </button>
                  <button
                    type="button"
                    className="cancel-action"
                    onClick={() => {
                      setEditingProductId(null);
                      setProductDraft(null);
                    }}
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : null}

            <section className="ticket-price-section">
              <div className="ticket-price-heading">
                <div>
                  <strong>Tarif berlaku</strong>
                  <span>Harga mengikuti tanggal kunjungan.</span>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setPriceDraft(newPriceDraft(product.id))}
                  >
                    ＋ Tambah tarif
                  </button>
                ) : null}
              </div>

              <div className="ticket-price-list">
                {product.prices.map((price) => (
                  <div
                    className={`ticket-price-row ${
                      price.active
                        ? "ticket-price-active"
                        : "ticket-price-inactive"
                    }`}
                    key={price.id}
                  >
                    <div>
                      <span>{dayLabel(price.dayType)}</span>
                      <strong>{currency.format(price.price)}</strong>
                    </div>
                    <p>
                      {price.validFrom} — {price.validUntil ?? "seterusnya"}
                    </p>
                    <small
                      className={
                        price.active
                          ? "ticket-price-status-active"
                          : "ticket-price-status-inactive"
                      }
                    >
                      <i aria-hidden="true" />
                      {price.active ? "Aktif" : "Nonaktif"}
                    </small>
                    {canManage ? (
                      <button type="button" onClick={() => beginPriceEdit(price)}>
                        Edit
                      </button>
                    ) : null}
                    <Toggle
                      active={price.active}
                      label={`${dayLabel(price.dayType)} ${product.name}`}
                      disabled={!canManage || saving}
                      onChange={() => void togglePrice(price)}
                    />
                  </div>
                ))}
                {product.prices.length === 0 ? (
                  <div className="ticket-price-empty">
                    Tarif belum ditentukan. Tambahkan harga weekday dan weekend.
                  </div>
                ) : null}
              </div>
            </section>
          </article>
        ))}
      </div>

      {priceDraft ? (
        <form className="ticket-price-form" onSubmit={savePrice}>
          <div className="ticket-price-form-heading">
            <div>
              <span>Master tarif</span>
              <strong>
                {products.find(
                  (product) => product.id === priceDraft.ticketProductId,
                )?.name ?? "Tiket"}
              </strong>
            </div>
            <button type="button" onClick={() => setPriceDraft(null)}>
              ×
            </button>
          </div>
          <label>
            <span>Jenis hari</span>
            <select
              value={priceDraft.dayType}
              onChange={(event) =>
                setPriceDraft({
                  ...priceDraft,
                  dayType: event.target.value as TicketDayType,
                })
              }
            >
              <option value="weekday">Weekday</option>
              <option value="weekend">Weekend & hari libur</option>
            </select>
          </label>
          <label>
            <span>Harga (Rupiah)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={priceDraft.price}
              onChange={(event) =>
                setPriceDraft({ ...priceDraft, price: event.target.value })
              }
            />
          </label>
          <label>
            <span>Berlaku mulai</span>
            <input
              type="date"
              value={priceDraft.validFrom}
              onChange={(event) =>
                setPriceDraft({
                  ...priceDraft,
                  validFrom: event.target.value,
                })
              }
            />
          </label>
          <label>
            <span>Berlaku sampai (opsional)</span>
            <input
              type="date"
              value={priceDraft.validUntil ?? ""}
              onChange={(event) =>
                setPriceDraft({
                  ...priceDraft,
                  validUntil: event.target.value || null,
                })
              }
            />
          </label>
          <div className="ticket-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan tarif"}
            </button>
            <button
              type="button"
              className="cancel-action"
              onClick={() => setPriceDraft(null)}
            >
              Batal
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
