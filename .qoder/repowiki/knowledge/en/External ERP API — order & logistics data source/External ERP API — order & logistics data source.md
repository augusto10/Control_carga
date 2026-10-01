---
kind: external_dependency
name: External ERP API — order & logistics data source
slug: erp-api
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

The system consumes an external ERP endpoint (`API_EXTERNA_BASE_URL`, defaulting to an EC2 instance in `sa-east-1`) authenticated via `API_EXTERNA_USERNAME` / `API_EXTERNA_PASSWORD`. It is used both for live logistics queries (`pedido-logistica-atual`) and as a fallback when local snapshots are stale. A separate product-sync workflow uses `ERP_API_URL` + `ERP_API_USERNAME` / `ERP_API_PASSWORD` to pull label-product catalogs into `src/data/products-maxima.json` via GitHub Actions.