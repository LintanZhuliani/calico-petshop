// ===================================================
// SCHEMA INDEX — Re-export all schema tables & relations
// ===================================================

export {
  user,
  userRelations,
  session,
  sessionRelations,
  account,
  accountRelations,
  verification,
} from "./auth.js";

export { branch, branchRelations } from "./branch.js";

export { product, productRelations } from "./product.js";

export { branchStock, branchStockRelations } from "./branch-stock.js";

export { batch, batchRelations } from "./batch.js";

export {
  transaction,
  transactionRelations,
  transactionItem,
  transactionItemRelations,
} from "./transaction.js";

export {
  transfer,
  transferRelations,
  transferItem,
  transferItemRelations,
} from "./transfer.js";
