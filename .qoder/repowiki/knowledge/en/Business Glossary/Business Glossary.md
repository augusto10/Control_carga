---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### RLR
- Definition：Abbreviation for "retira no ato" (pick-up at the warehouse), a delivery type that must be excluded from the dashboard's pending-orders cards because these orders are not shipped but collected directly by the customer.
- Aliases：retira no ato、ATO、NDF、RDL、RETIRA

### Pedidos não encontrados
- Definition：Dashboard card that displays orders flagged as having missing products by the ERP; entries must only appear when there are actual items listed in `produtosPendentes` with a positive `totalItensPendentes` count.
- Aliases：pendencias card、pedidos pendentes

### Logística snapshot
- Definition：Locally cached copy of order/logistics data stored in the database so the dashboard can render without hitting the external ERP API on every load; the code first reads from this snapshot and falls back to the ERP when it is stale.
- Aliases：snapshot、logistica-snapshot

### Controle de Carga
- Definition：The name of the application itself — a web system for controlling cargo loads and fiscal notes (notas fiscais) with barcode scanning, manifest generation, and logistics tracking.
- Aliases：controle-carga-web、sistema controle carga
