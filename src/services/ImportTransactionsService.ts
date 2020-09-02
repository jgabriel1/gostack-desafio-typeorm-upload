import csvParse from 'csv-parse';
import fs from 'fs';
import { Repository, getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  filePath: string;
}

interface CreateTransactionDTO {
  type: 'income' | 'outcome';
  title: string;
  value: number;
  category: string;
}

class ImportTransactionsService {
  private transactionsRepository: TransactionsRepository;

  private categoriesRepository: Repository<Category>;

  constructor() {
    this.transactionsRepository = getCustomRepository(TransactionsRepository);
    this.categoriesRepository = getRepository(Category);
  }

  private async createAllCategories(
    categories: Set<string>,
  ): Promise<Category[]> {
    const filteredCategoryTitles = Array.from(categories).filter(
      async categoryTitle => {
        const categoryAlreadyExists = await this.categoriesRepository.findOne({
          where: { title: categoryTitle },
        });

        return !categoryAlreadyExists;
      },
    );

    const categoriesToCreate = filteredCategoryTitles.map(title =>
      this.categoriesRepository.create({ title }),
    );

    const createdCategories = await this.categoriesRepository.save(
      categoriesToCreate,
    );

    return createdCategories;
  }

  private async createTransactions(
    transactions: CreateTransactionDTO[],
    categories: Category[],
  ): Promise<Transaction[]> {
    const transactionsToCreate = transactions.map(
      ({ title, type, value, category: categoryTitle }) => {
        const category = categories.find(item => item.title === categoryTitle);

        const transactionToBeCreated = this.transactionsRepository.create({
          title,
          value,
          type,
          category_id: category?.id,
        });

        return transactionToBeCreated;
      },
    );

    const createdTransactions = await this.transactionsRepository.save(
      transactionsToCreate,
    );

    return createdTransactions;
  }

  public async execute({ filePath }: Request): Promise<Transaction[]> {
    const fileStream = fs.createReadStream(filePath);

    const csvParser = csvParse({
      from_line: 2,
    });

    const parseCSV = fileStream.pipe(csvParser);

    const transactions = new Array<CreateTransactionDTO>();
    const categories = new Set<string>();

    parseCSV.on('data', async (line: string[]) => {
      const [title, type, value, category] = line.map(cell => cell.trim());

      categories.add(category);
      transactions.push({
        title,
        type: type === ('outcome' || 'income') ? type : 'income',
        category,
        value: Number(value),
      });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const createdCategories = await this.createAllCategories(categories);
    const createdTransactions = await this.createTransactions(
      transactions,
      createdCategories,
    );

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
