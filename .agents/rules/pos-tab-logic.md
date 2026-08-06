---
description: Business logic and definitions for POS order filtering tabs (DaftarPesananPage)
---
# POS Order Tab Logic

When modifying the order lists or tabs in the POS application, STRICTLY adhere to the following definitions. The tabs are NOT mutually exclusive:

- **Pesanan Baru**: Must show ALL orders created TODAY, regardless of their status (PENDING/COMPLETED) or payment method.
- **Belum Dibayar**: Must show ALL unpaid (PENDING) orders, regardless of when they were created. This MUST INCLUDE Piutang orders. Do not exclude Piutang from this tab.
- **Piutang**: Must show only orders where paymentMethod is Piutang.
- **Sudah Dibayar**: Must show only COMPLETED orders.
