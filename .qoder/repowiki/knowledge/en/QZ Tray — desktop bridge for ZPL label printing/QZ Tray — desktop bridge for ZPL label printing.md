---
kind: external_dependency
name: QZ Tray — desktop bridge for ZPL label printing
slug: qz-tray
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

`qz-tray` is used to send ZPL label templates (under `public/templates/`) to a locally running QZ Tray process for physical printer output. This requires the QZ Tray desktop application to be installed on the user's machine and communicates over a local socket.