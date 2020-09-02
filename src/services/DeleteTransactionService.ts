import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';

interface Request {
  transactionId: string;
}

class DeleteTransactionService {
  private transactionsRepository: TransactionsRepository;

  constructor() {
    this.transactionsRepository = getCustomRepository(TransactionsRepository);
  }

  private async getTransactionById(
    transactionId: string,
  ): Promise<Transaction | null> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id: transactionId },
    });

    return transaction || null;
  }

  public async execute({ transactionId }: Request): Promise<void> {
    const transactionToBeDeleted = await this.getTransactionById(transactionId);

    if (!transactionToBeDeleted) {
      throw new AppError("Transaction doesn't exist.", 404);
    }

    await this.transactionsRepository.remove(transactionToBeDeleted);
  }
}

export default DeleteTransactionService;
