// import AppError from '../errors/AppError';

import { getCustomRepository, getRepository, Repository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  private transactionsRepository: TransactionsRepository;

  private categoriesRepository: Repository<Category>;

  constructor() {
    this.transactionsRepository = getCustomRepository(TransactionsRepository);
    this.categoriesRepository = getRepository(Category);
  }

  private async validateTransaction(
    value: number,
    type: 'income' | 'outcome',
  ): Promise<boolean> {
    if (type === 'income') {
      return true;
    }

    const balance = await this.transactionsRepository.getBalance();

    return value <= balance.total;
  }

  private async getCategoryByTitle(
    categoryTitle: string,
  ): Promise<Category | null> {
    const category = await this.categoriesRepository.findOne({
      where: { title: categoryTitle },
    });

    return category || null;
  }

  private async createNewCategory(categoryTitle: string): Promise<Category> {
    const category = this.categoriesRepository.create({
      title: categoryTitle,
    });

    await this.categoriesRepository.save(category);

    return category;
  }

  private async getCategoryId(categoryTitle: string): Promise<string> {
    const category = await this.getCategoryByTitle(categoryTitle);

    if (!category) {
      const newCategory = await this.createNewCategory(categoryTitle);

      return newCategory.id;
    }

    return category.id;
  }

  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const isTransactionValid = await this.validateTransaction(value, type);

    if (!isTransactionValid) {
      throw new AppError('Invalid transaction!', 400);
    }

    const categoryId = await this.getCategoryId(category);

    const transaction = this.transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryId,
    });

    await this.transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
