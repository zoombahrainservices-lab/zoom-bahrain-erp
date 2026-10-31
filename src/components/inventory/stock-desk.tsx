"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import { documentStatusLabel, ownershipLabel } from "@/lib/stock/display";
import { todayInputDate } from "@/lib/utils";

type Line = {
  lineKey: string;
  sku: string;
  name: string;
  quantity: string;
  unit: string;
  unitCost: string;
};

type Overview = {
  sku: string;
  name: string;
  unit: string;
  ownership: string;
  ownerId: string;
  ownerName: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  postedQuantity: string;
  pendingQuantity: string;
  awaitingDispatch: string;
  availableQuantity: string;
  latestMovement: string;
  status: string;
};

type DeskDocument = {
  id: string;
  status: string;
  kind: string;
  purpose: string;
  ownership: string;
  ownerId: string;
  ownerName: string;
  warehouseName: string;
  locationName: string;
  toWarehouseName: string;
  toLocationName: string;
  movedOn: string;
  reference: string;
  counterparty: string;
  note: string;
  reversalOfId: string | null;
  reversedById: string | null;
  postBlock: string | null;
  lines: Array<{ sku: string; name: string; quantity: string; unit: string; unitCost: string | null; valuation: string }>;
};

type DeskData = {
  companyId: string;
  customers: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string; locations: Array<{ id: string; name: string }> }>;
  notes: Array<{ id: string; entryType: string; label: string }>;
  overview: Overview[];
  documents: DeskDocument[];
};

type Mode = "receipt" | "dispatch" | "transfer" | "return" | "adjustment";

const emptyLine = (): Line => ({
  lineKey: crypto.randomUUID(),
  sku: "",
  name: "",
  quantity: "",
  unit: "ea",
  unitCost: "",
});

export function InventoryStockDesk({
  data,
  companies,
  canOperate,
  canPostFinancial,
  canViewValuation,
}: {
  data: DeskData;
  companies: Array<{ id: string; name: string }>;
  canOperate: boolean;
  canPostFinancial: boolean;
  canViewValuation: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("receipt");
  const [documentId, setDocumentId] = useState(() => crypto.randomUUID());
  const [ownership, setOwnership] = useState<"company" | "customer">("customer");
  const [ownerId, setOwnerId] = useState(data.customers[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(data.warehouses[0]?.id ?? "");
  const [locationId, setLocationId] = useState(data.warehouses[0]?.locations[0]?.id ?? "");
  const [warehouseName, setWarehouseName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [movedOn, setMovedOn] = useState(todayInputDate());
  const [reference, setReference] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [note, setNote] = useState("");
  const [sourceEntryId, setSourceEntryId] = useState("");
  const [purpose, setPurpose] = useState("other");
  const [confirmZeroCost, setConfirmZeroCost] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [skuFilter, setSkuFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const locations = data.warehouses.find((warehouse) => warehouse.id === warehouseId)?.locations ?? [];
  const destinationLocations = data.warehouses.find((warehouse) => warehouse.id === toWarehouseId)?.locations ?? [];
  const kind = mode === "receipt" ? "receipt" : mode === "dispatch" ? "dispatch" : mode === "transfer" ? "transfer" : mode === "return" ? "return" : "adjustment";
  const resolvedPurpose = mode === "receipt" ? "receipt" : mode === "transfer" ? "transfer" : mode === "return" ? "customer_return" : mode === "adjustment" ? purpose : purpose;
  const showCost = ownership === "company" && (mode === "receipt" || mode === "return" || (mode === "adjustment" && purpose === "adjustment_in"));
  const zeroCost = showCost && lines.some((line) => ["0", "0.0", "0.00", "0.000"].includes(line.unitCost.trim()));

  const filtered = useMemo(() => data.overview.filter((row) => {
    if (ownershipFilter !== "all" && row.ownership !== ownershipFilter) return false;
    if (customerFilter !== "all" && row.ownerId !== customerFilter) return false;
    if (warehouseFilter !== "all" && row.warehouseId !== warehouseFilter) return false;
    if (locationFilter !== "all" && row.locationId !== locationFilter) return false;
    if (skuFilter.trim() && !`${row.sku} ${row.name}`.toLowerCase().includes(skuFilter.trim().toLowerCase())) return false;
    return true;
  }), [customerFilter, data.overview, locationFilter, ownershipFilter, skuFilter, warehouseFilter]);

  const documents = data.documents.filter((document) => {
    if (kindFilter !== "all" && document.kind !== kindFilter) return false;
    if (statusFilter !== "all" && document.status !== statusFilter) return false;
    if (ownershipFilter !== "all" && document.ownership !== ownershipFilter) return false;
    if (skuFilter.trim() && !document.lines.some((line) => line.sku.toLowerCase().includes(skuFilter.trim().toLowerCase()))) return false;
    return true;
  });

  function availableFor(sku: string) {
    const owner = ownership === "company" ? data.companyId : ownerId;
    const row = data.overview.find((item) =>
      item.sku.toLowerCase() === sku.trim().toLowerCase() &&
      item.ownership === ownership &&
      item.ownerId === owner &&
      item.warehouseId === warehouseId &&
      item.locationId === locationId
    );
    return row?.availableQuantity ?? "0.000";
  }

  function updateLine(lineKey: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => line.lineKey === lineKey ? { ...line, ...patch } : line));
  }

  async function save(submit: boolean) {
    if (!canOperate) return;
    setSaving(true);
    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          id: documentId,
          companyId: data.companyId,
          kind,
          purpose: resolvedPurpose,
          ownership,
          ownerId: ownership === "customer" ? ownerId : data.companyId,
          warehouseId: warehouseId || null,
          locationId: locationId || null,
          warehouseName: warehouseId ? null : warehouseName,
          locationName: locationId ? null : locationName,
          toWarehouseId: mode === "transfer" ? toWarehouseId || null : null,
          toLocationId: mode === "transfer" ? toLocationId || null : null,
          movedOn,
          reference,
          counterparty,
          note,
          sourceEntryId: sourceEntryId || null,
          confirmZeroCost,
          lines: lines.map((line) => ({
            lineKey: line.lineKey,
            sku: line.sku,
            name: line.name,
            unit: line.unit,
            quantity: line.quantity,
            unitCost: showCost ? line.unitCost : null,
          })),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The stock document was not saved.");
      toast.success(submit ? "Submitted for approval. Quantities stay unchanged until it is posted." : "Draft saved. Quantities are unchanged.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The stock document was not saved.");
    } finally {
      setSaving(false);
    }
  }

  async function act(action: "approve" | "post" | "reverse", id: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, movedOn: todayInputDate(), confirmZeroCost }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The stock action failed.");
      toast.success(action === "approve" ? "Approved. Balances are unchanged." : action === "post" ? "Posted." : "Reversal posted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The stock action failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-heading">Stock documents</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Draft and approval do not change quantities. Only a successful post updates the new stock balances. Earlier Inventory Desk notes stay in the list above and are not reposted.
          {canViewValuation ? " Company inventory value stays on Accounting → Control, separate from these operational balances." : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={data.companyId} onChange={(event) => router.push(`/inventory?stockCompany=${event.target.value}`)}>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </Select>
      </div>

      {canOperate ? (
        <form
          className="space-y-4 rounded-xl bg-surface p-4 ring-1 ring-border"
          onSubmit={(event) => {
            event.preventDefault();
            void save(false);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={mode} onChange={(event) => {
              const next = event.target.value as Mode;
              setMode(next);
              setDocumentId(crypto.randomUUID());
              setPurpose(next === "adjustment" ? "adjustment_in" : "other");
            }}>
              <option value="receipt">Receiving</option>
              <option value="dispatch">Dispatch</option>
              <option value="transfer">Transfer</option>
              <option value="return">Return</option>
              {canPostFinancial ? <option value="adjustment">Adjustment</option> : null}
            </Select>
            <Select value={ownership} onChange={(event) => setOwnership(event.target.value as "company" | "customer")}>
              <option value="customer">Customer-owned</option>
              <option value="company">Company-owned</option>
            </Select>
            {ownership === "customer" ? (
              <Select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                <option value="">Choose a customer</option>
                {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </Select>
            ) : <p className="self-center text-sm text-text-secondary">Owned by this company</p>}
            <Input type="date" value={movedOn} onChange={(event) => setMovedOn(event.target.value)} required />
          </div>
          {ownership === "company" ? (
            <p className="text-sm text-text-secondary">
              A company-owned movement that needs an inventory journal can be saved and approved. It will not post, and it will not change posted quantities, until financial posting is verified. Leave the unit cost blank to record pending valuation. Blank is not zero.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={warehouseId} onChange={(event) => {
              setWarehouseId(event.target.value);
              const nextLocations = data.warehouses.find((warehouse) => warehouse.id === event.target.value)?.locations ?? [];
              setLocationId(nextLocations[0]?.id ?? "");
            }}>
              <option value="">New warehouse</option>
              {data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
            {warehouseId ? (
              <Select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">New location</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Select>
            ) : (
              <>
                <Input value={warehouseName} onChange={(event) => setWarehouseName(event.target.value)} placeholder="Warehouse" />
                <Input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Storage location" />
              </>
            )}
            {warehouseId && !locationId ? <Input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="New storage location" /> : null}
            <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={mode === "dispatch" ? "Dispatch reference" : "Receipt reference"} />
            <Input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder={mode === "dispatch" ? "Destination / recipient" : "Supplier or source"} />
          </div>
          {mode === "dispatch" ? (
            <Select value={purpose} onChange={(event) => setPurpose(event.target.value)}>
              <option value="other">Release / other</option>
              <option value="sale">Sale</option>
              <option value="consumption">Consumption</option>
              <option value="supplier_return">Supplier return</option>
              {canPostFinancial ? <option value="write_off">Write-off</option> : null}
            </Select>
          ) : null}
          {mode === "adjustment" ? (
            <Select value={purpose} onChange={(event) => setPurpose(event.target.value)}>
              <option value="adjustment_in">Increase</option>
              <option value="adjustment_out">Decrease</option>
            </Select>
          ) : null}
          {mode === "transfer" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={toWarehouseId} onChange={(event) => {
                setToWarehouseId(event.target.value);
                setToLocationId(data.warehouses.find((warehouse) => warehouse.id === event.target.value)?.locations[0]?.id ?? "");
              }}>
                <option value="">Destination warehouse</option>
                {data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </Select>
              <Select value={toLocationId} onChange={(event) => setToLocationId(event.target.value)}>
                <option value="">Destination location</option>
                {destinationLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Select>
            </div>
          ) : null}
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.lineKey} className="grid gap-3 sm:grid-cols-6">
                <Input value={line.sku} onChange={(event) => updateLine(line.lineKey, { sku: event.target.value })} placeholder="SKU" required />
                <Input value={line.name} onChange={(event) => updateLine(line.lineKey, { name: event.target.value })} placeholder="Description" className="sm:col-span-2" />
                <Input value={line.quantity} onChange={(event) => updateLine(line.lineKey, { quantity: event.target.value })} placeholder="Quantity" required />
                <Input value={line.unit} onChange={(event) => updateLine(line.lineKey, { unit: event.target.value })} placeholder="Unit" />
                {showCost ? (
                  <Input value={line.unitCost} onChange={(event) => updateLine(line.lineKey, { unitCost: event.target.value })} placeholder="Unit cost, blank if unknown" />
                ) : mode === "dispatch" ? (
                  <p className="self-center text-sm text-text-secondary">Available {availableFor(line.sku)}</p>
                ) : <span />}
                {index > 0 ? <Button type="button" onClick={() => setLines((current) => current.filter((item) => item.lineKey !== line.lineKey))}>Remove</Button> : null}
              </div>
            ))}
            <Button type="button" onClick={() => setLines((current) => [...current, emptyLine()])}>Add SKU line</Button>
          </div>
          {zeroCost ? (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={confirmZeroCost} onChange={(event) => setConfirmZeroCost(event.target.checked)} />
              This zero cost is intentional
            </label>
          ) : null}
          <Select value={sourceEntryId} onChange={(event) => setSourceEntryId(event.target.value)}>
            <option value="">Do not link an old note</option>
            {data.notes.map((note) => <option key={note.id} value={note.id}>{note.label}</option>)}
          </Select>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Remarks" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>Save draft</Button>
            <Button type="button" disabled={saving} onClick={() => void save(true)}>Submit for approval</Button>
          </div>
        </form>
      ) : <p className="text-sm text-text-secondary">You can view stock documents. Recording them needs warehouse permission.</p>}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-heading">Stock overview</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value)}>
            <option value="all">Company and customer</option>
            <option value="company">Company-owned</option>
            <option value="customer">Customer-owned</option>
          </Select>
          <Select value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
            <option value="all">All customers</option>
            {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </Select>
          <Select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
            <option value="all">All warehouses</option>
            {data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
            <option value="all">All locations</option>
            {data.warehouses.flatMap((warehouse) => warehouse.locations).map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </Select>
          <Input value={skuFilter} onChange={(event) => setSkuFilter(event.target.value)} placeholder="SKU" />
          <Select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
            <option value="all">Receipt and dispatch</option>
            <option value="receipt">Receipt</option>
            <option value="dispatch">Dispatch</option>
            <option value="transfer">Transfer</option>
            <option value="return">Return</option>
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All document statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
            <option value="reversed">Reversed</option>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-text-secondary">
              <tr>
                <th className="px-2 py-2 font-medium">SKU</th>
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Owner</th>
                <th className="px-2 py-2 font-medium">Warehouse</th>
                <th className="px-2 py-2 font-medium">Location</th>
                <th className="px-2 py-2 font-medium">Posted</th>
                <th className="px-2 py-2 font-medium">Pending receiving</th>
                <th className="px-2 py-2 font-medium">Awaiting dispatch</th>
                <th className="px-2 py-2 font-medium">Unit</th>
                <th className="px-2 py-2 font-medium">Latest</th>
                <th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.ownerId}-${row.sku}-${row.locationId}`} className="border-t border-border">
                  <td className="px-2 py-2">{row.sku}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2">{ownershipLabel(row.ownership)} · {row.ownerName}</td>
                  <td className="px-2 py-2">{row.warehouseName}</td>
                  <td className="px-2 py-2">{row.locationName}</td>
                  <td className="px-2 py-2 tabular-nums">{row.postedQuantity}</td>
                  <td className="px-2 py-2 tabular-nums">{row.pendingQuantity}</td>
                  <td className="px-2 py-2 tabular-nums">{row.awaitingDispatch}</td>
                  <td className="px-2 py-2">{row.unit}</td>
                  <td className="px-2 py-2">{row.latestMovement}</td>
                  <td className="px-2 py-2">{row.status}</td>
                </tr>
              ))}
              {filtered.length === 0 ? <tr><td className="px-2 py-3 text-text-secondary" colSpan={11}>No posted stock matches these filters. A blank new subledger is not the company&apos;s existing stock.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-text-secondary">Pending valuation is physically received and is not available to dispatch. Awaiting dispatch is a document that is not posted yet. It does not reduce the posted quantity.</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-heading">Document history</h3>
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="rounded-lg bg-surface p-3 text-sm ring-1 ring-border">
              <p className="font-medium text-heading">{document.reference || document.kind} · {documentStatusLabel(document.status)} · {ownershipLabel(document.ownership)} · {document.ownerName}</p>
              <p className="text-text-secondary">{document.movedOn} · {document.warehouseName} / {document.locationName}{document.toWarehouseName ? ` → ${document.toWarehouseName} / ${document.toLocationName}` : ""}{document.counterparty ? ` · ${document.counterparty}` : ""}</p>
              <ul className="mt-1 text-foreground">
                {document.lines.map((line) => (
                  <li key={`${document.id}-${line.sku}-${line.quantity}`}>{line.sku} · {line.name} · {line.quantity} {line.unit}{line.valuation === "pending" ? " · pending valuation" : ""}</li>
                ))}
              </ul>
              {document.note ? <p className="mt-1 text-text-secondary">{document.note}</p> : null}
              {document.reversalOfId ? <p className="mt-1 text-text-secondary">Reverses {document.reversalOfId}</p> : null}
              {document.reversedById ? <p className="mt-1 text-text-secondary">Reversed by {document.reversedById}</p> : null}
              {document.postBlock ? <p className="mt-1 text-text-secondary">{document.postBlock}</p> : null}
              {canOperate && document.status === "draft" ? <div className="mt-2"><Button type="button" disabled={saving} onClick={() => void act("approve", document.id)}>Approve</Button></div> : null}
              {canOperate && document.status === "approved" && !document.postBlock ? <div className="mt-2"><Button type="button" disabled={saving} onClick={() => void act("post", document.id)}>Post</Button></div> : null}
              {canOperate && document.status === "posted" && !document.reversedById && !document.reversalOfId ? <div className="mt-2"><Button type="button" disabled={saving} onClick={() => void act("reverse", document.id)}>Reverse</Button></div> : null}
            </li>
          ))}
          {documents.length === 0 ? <li className="text-sm text-text-secondary">No stock documents for these filters.</li> : null}
        </ul>
      </div>
    </section>
  );
}
