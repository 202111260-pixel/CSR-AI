export interface Expense {
  id: string;
  projectId: string;
  amount: number;
  category: string;
  description?: string;
  invoiceUrl?: string;
  approvedBy?: string;
  createdAt: string;
}
