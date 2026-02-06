import { Transaction } from '@/types/finance';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
  limit?: number;
}

export function TransactionList({ transactions, limit }: TransactionListProps) {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return <ArrowDownRight className="w-4 h-4 text-emerald-500" />;
      case 'expense':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'transfer':
        return <ArrowLeftRight className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAmountColor = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return 'text-emerald-500';
      case 'expense':
        return 'text-red-500';
      case 'transfer':
        return 'text-blue-500';
    }
  };

  if (displayTransactions.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-zinc-900/50 text-sm text-zinc-500 border border-dashed border-zinc-800">
        Sin transacciones registradas.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800">
              {getTransactionIcon(transaction.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-200 truncate">
                {transaction.description}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>{transaction.category}</span>
                {transaction.isShared && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-500">Compartido</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right ml-4">
            <div className={`text-sm font-semibold ${getAmountColor(transaction.type)}`}>
              {transaction.amount >= 0 ? '+' : ''}$
              {Math.abs(transaction.amount).toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500">
              {format(new Date(transaction.date), 'dd MMM')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}