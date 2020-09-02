import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce<Balance>(
      (accum, transaction) => {
        switch (transaction.type) {
          case 'income':
            return {
              ...accum,
              income: accum.income + transaction.value,
              total: accum.total + transaction.value,
            };
          case 'outcome':
            return {
              ...accum,
              outcome: accum.outcome + transaction.value,
              total: accum.total - transaction.value,
            };
          default:
            return {
              ...accum,
            };
        }
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return balance;
  }
}

export default TransactionsRepository;
