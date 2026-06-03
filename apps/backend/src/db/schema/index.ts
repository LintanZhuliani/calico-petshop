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
} from "./auth";

export { branch, branchRelations } from "./branch";

export { product, productRelations } from "./product";

export { branchStock, branchStockRelations } from "./branch-stock";

export { batch, batchRelations } from "./batch";

export {
  transaction,
  transactionRelations,
  transactionItem,
  transactionItemRelations,
} from "./transaction";

export {
  transfer,
  transferRelations,
  transferItem,
  transferItemRelations,
} from "./transfer";
