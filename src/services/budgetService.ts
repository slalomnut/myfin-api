import { performDatabaseRequest, prisma } from "../config/prisma.js";
import { MYFIN } from "../consts.js";
import ConvertUtils from "../utils/convertUtils.js";
import CategoryService from "./categoryService.js";
import AccountService from "./accountService.js";
import DateTimeUtils from "../utils/DateTimeUtils.js";
import Logger from "../utils/Logger.js";
import { Prisma, PrismaClient } from "@prisma/client";

export enum BudgetListOrder {
  DESCENDING = "DESC",
  ASCENDING = "ASC",
}

type BudgetWithAmounts = {
  budget_id: bigint;
  month: number;
  year: number;
  observations: string;
  is_open: boolean;
  initial_balance: bigint;
  users_user_id: bigint;
  balance_value?: number;
  balance_change_percentage?: number | "NaN";
  credit_amount?: number;
  debit_amount?: number;
  savings_rate_percentage?: number;
}

class BudgetService {

  static async getAllCategoriesForUser(
    userId: number | bigint,
    budgetId: number | bigint,
    dbClient = prisma
  ): Promise<Array<any>> {
    return dbClient.$queryRaw`
      SELECT users_user_id,
             category_id,
             name,
             status,
             type,
             description,
             color_gradient,
             budgets_budget_id,
             exclude_from_budgets,
             truncate((coalesce(planned_amount_credit, 0) / 100), 2) as planned_amount_credit,
             truncate((coalesce(planned_amount_debit, 0) / 100), 2) as planned_amount_debit,
             truncate((coalesce(current_amount, 0) / 100), 2) as current_amount
      FROM (
        SELECT *
        FROM budgets_has_categories
        WHERE budgets_users_user_id = ${userId}
                             AND (budgets_budget_id = ${budgetId})) b
      RIGHT JOIN categories ON categories.category_id = b.categories_category_id
      WHERE users_user_id = ${userId}
        AND status = ${MYFIN.CATEGORY_STATUS.ACTIVE}`;
  }

  static async calculateBudgetBalance(
    userId: number | bigint,
    budget: Prisma.budgetsUpdateInput,
    dbClient = undefined
  ) {
    return performDatabaseRequest(async (prismaTx) => {
      const budgetId = budget.budget_id;
      const month = budget.month;
      const year = budget.year;
      const isOpen = budget.is_open;
      const categories = await this.getAllCategoriesForUser(userId, budgetId as number, prismaTx);
      let balance = 0;
      for (const category of categories) {
        let amountCredit = 0;
        let amountDebit = 0;

        if (isOpen) {
          amountCredit = Math.abs(ConvertUtils.convertFloatToBigInteger(category.planned_amount_credit));
          amountDebit = Math.abs(ConvertUtils.convertFloatToBigInteger(category.planned_amount_debit));
        } else {
          const calculatedAmounts = await CategoryService.getAmountForCategoryInMonth(
            category.category_id,
            month as number,
            year as number,
            true,
            prismaTx
          );
          const calculatedAmountsFromInvestmentAccounts = await AccountService.getAmountForInvestmentAccountsInMonth(
            category.category_id,
            month as number,
            year as number,
            prismaTx
          );

          const creditFromInvestmentAccounts = calculatedAmountsFromInvestmentAccounts.account_balance_credit;
          const expensesFromInvestmentAccounts = calculatedAmountsFromInvestmentAccounts.account_balance_debit;

          amountCredit = Math.abs(calculatedAmounts.category_balance_credit) - creditFromInvestmentAccounts;
          amountDebit = Math.abs(calculatedAmounts.category_balance_debit) - expensesFromInvestmentAccounts;
        }

        if (!category.exclude_from_budgets) {
          balance += amountCredit - amountDebit;
        }
      }

      return ConvertUtils.convertBigIntegerToFloat(BigInt(isNaN(balance) ? 0 : balance));
    }, dbClient);
  }

  private static async getSumAmountsForBudget(userId: bigint, budget: Prisma.budgetsUpdateInput, dbClient = undefined) {
    return performDatabaseRequest(async (prismaTx) => {
      const budgetId = budget.budget_id;
      const month = parseInt(budget.month as any, 10);
      const year = parseInt(budget.year as any, 10);
      const isOpen = budget.is_open;

      const categories: any = await this.getAllCategoriesForUser(userId, budgetId as bigint, prismaTx);
      let balanceCredit = 0;
      let balanceDebit = 0;

      for await (const category of categories) {
        let amountCredit = 0;
        let amountDebit = 0;

        // @ts-ignore
        if (isOpen === 1) {
          amountCredit = Math.abs(ConvertUtils.convertFloatToBigInteger(category.planned_amount_credit));
          amountDebit = Math.abs(ConvertUtils.convertFloatToBigInteger(category.planned_amount_debit));
        } else {
          const calculatedAmounts = await CategoryService.getAmountForCategoryInMonth(
            category.category_id,
            month,
            year,
            true,
            prismaTx
          );

          const calculatedAmountsFromInvestmentAccounts = await AccountService.getAmountForInvestmentAccountsInMonth(
            category.category_id,
            month,
            year,
            prismaTx
          );

      /* Logger.addLog(
              `Category: ${category.category_id} | calculatedAmounts: ${JSON.stringify(
                calculatedAmounts
              )} | calculatedAmountsFromInvestmentAccounts: ${JSON.stringify(
                calculatedAmountsFromInvestmentAccounts
              )}`
            ); */
      // Unrealized gains
      const creditFromInvestmentAccounts =
        calculatedAmountsFromInvestmentAccounts?.account_balance_credit;
      // Unrealized losses
          const expensesFromInvestmentAccounts = calculatedAmountsFromInvestmentAccounts?.account_balance_debit;

      // remove unrealized gains from budget calcs
      amountCredit =
        Math.abs(calculatedAmounts?.category_balance_credit) - creditFromInvestmentAccounts;
      // remove unrealized losses from budget calcs
          amountDebit = Math.abs(calculatedAmounts?.category_balance_debit) - expensesFromInvestmentAccounts;
        }

    /* Logger.addLog(
          `Category: ${category.category_id} | amountCredit: ${amountCredit} | amountDebit: ${amountDebit}`
        ); */

        if (!category.exclude_from_budgets) {
          balanceCredit += amountCredit;
          balanceDebit += amountDebit;
        }
      }
  /* Logger.addLog(`balanceCredit: ${balanceCredit} | balanceDebit: ${balanceDebit}`); */

      return {
        balance_credit: ConvertUtils.convertBigIntegerToFloat(BigInt(balanceCredit)),
        balance_debit: ConvertUtils.convertBigIntegerToFloat(BigInt(balanceDebit)),
      };
    }, dbClient);
  }

  static async calculateBudgetBalanceChangePercentage(
    userId: bigint,
    budget: Prisma.budgetsUpdateInput,
    budgetBalance: number,
    dbClient = prisma
  ) {
    const month = parseInt(budget.month as any, 10);
    const year = parseInt(budget.year as any, 10);

    const initialBalance = await AccountService.getBalancesSnapshotForMonthForUser(
      userId,
      month > 1 ? month - 1 : 12,
      month > 1 ? year : year - 1,
      true,
      dbClient
    );

    const finalBalance = initialBalance + budgetBalance;
    if (initialBalance === 0) {
      return "NaN";
    }

    return ((finalBalance - initialBalance) / Math.abs(initialBalance)) * 100;
  }

  static async getBudgetsListForUser(userId: bigint, dbclient = prisma) {
    const whereCondition = { users_user_id: userId };

    return dbclient.budgets.findMany({
      where: whereCondition,
      select: {
        month: true,
        year: true,
        budget_id: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  static async getExpandedBudgetAmountsData(userId: bigint, budget: BudgetWithAmounts, dbClient = prisma) {
    const promises = [];
    promises.push(this.calculateBudgetBalance(userId, budget, dbClient));
    promises.push(this.calculateBudgetBalanceChangePercentage(userId, budget, budget.balance_value, dbClient));
    promises.push(this.getSumAmountsForBudget(userId, budget, dbClient));

    const [budgetBalance, balanceChangePercentage, budgetSums] = await Promise.all(promises);
    budget.balance_value = budgetBalance;
    budget.balance_change_percentage = balanceChangePercentage;
    budget.credit_amount = budgetSums.balance_credit;
    budget.debit_amount = budgetSums.balance_debit;
    budget.savings_rate_percentage = budget.credit_amount === 0 ? 0 : (budget.balance_value / budget.credit_amount) * 100;

    return budget;
  }

  static async getAllBudgetsForUser(userId: bigint, status: string, dbClient = prisma) {
    let whereCondition = {};
    if (status) {
      whereCondition = {
        users_user_id: userId,
        status: status,
      };
    } else {
      whereCondition = { users_user_id: userId };
    }

    const budgetsList: Array<BudgetWithAmounts> = await dbClient.budgets.findMany({
      where: whereCondition,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

  const budgetPromises = [];
  for await (const budget of budgetsList) {
    budgetPromises.push(this.getExpandedBudgetAmountsData(userId, budget, dbClient));
  }
    return Promise.all(budgetPromises);
  }

  static async getBudgetsForUserByPage(userId: bigint, page: number, pageSize: number, searchQuery: string, status: string, dbClient = prisma): Promise<{ total_count: number; filtered_count: number; results: Array<any> }> {
    const query = `%${searchQuery}%`;
    const offsetValue = page * pageSize;

    let isOpenValue = "%";
  if (status) {
    // eslint-disable-next-line default-case
    switch (status) {
      case "O":
        isOpenValue = "1";
        break;
      case "1":
        isOpenValue = "0";
        break;
      default:
        isOpenValue = "%";
        break;
    }
  }
  /*Logger.addLog(
      `userId: ${userId} | query: ${query} | offsetValue: ${offsetValue} | page: ${page} | pageSize: ${pageSize}} | isOpenValue: ${isOpenValue}`
  );*/

  // main query for list of results (limited by $pageSize and $offsetValue)
    const results: any = await dbClient.$queryRaw`
      SELECT budget_id, month, year, observations, is_open, users_user_id
      FROM budgets
      WHERE (users_user_id = ${userId})
        AND (observations LIKE ${query} OR month LIKE ${query} OR year LIKE ${query})
        AND is_open LIKE ${isOpenValue}
      GROUP BY budget_id
      ORDER BY year DESC, month DESC
      LIMIT ${pageSize}
      OFFSET ${offsetValue}`;

    const filteredCount = await dbClient.$queryRaw`
      SELECT count(*) as 'count'
      FROM (SELECT budget_id
            FROM budgets
            WHERE (users_user_id = ${userId})
              AND (observations LIKE ${query} OR month LIKE ${query} OR year LIKE ${query})
              AND is_open LIKE ${isOpenValue}
            GROUP BY budget_id) budget`;

  // count of total of results
    const totalCount = await dbClient.$queryRaw`
      SELECT count(*) as 'count'
      FROM budgets
      WHERE users_user_id = ${userId}`;

    return {
      results: results,
      filtered_count: parseInt(filteredCount[0].count, 10),
      total_count: parseInt(totalCount[0].count, 10),
    };
  }

  static async getFilteredBudgetsForUserByPage(userId: bigint, page: number, pageSize: number, query: string, status: string, dbClient = prisma) {
    return performDatabaseRequest(async (prismaTx) => {
      const budgetsArr = await this.getBudgetsForUserByPage(
        userId,
        page,
        pageSize,
        query,
        status,
        prismaTx
      );

      const balancePromises = budgetsArr.results.map(async budget => {
        const balanceValue = await this.calculateBudgetBalance(userId, budget, prismaTx);
        budget.balance_value = balanceValue;
        const balanceChangePercentage = await this.calculateBudgetBalanceChangePercentage(userId, budget, balanceValue, prismaTx);
        budget.balance_change_percentage = balanceChangePercentage;
        const budgetSums = await this.getSumAmountsForBudget(userId, budget, prismaTx);
        budget.credit_amount = budgetSums.balance_credit;
        budget.debit_amount = budgetSums.balance_debit;
        budget.savings_rate_percentage = parseFloat(budget.credit_amount) === 0 ? 0 : (parseFloat(budget.balance_value) / parseFloat(budget.credit_amount)) * 100;
      });

      await Promise.all(balancePromises);
      return budgetsArr;
    }, dbClient);
  }

  static async getCategoryDataForNewBudget(userId: bigint) {
    const categories = await CategoryService.getAllCategoriesForUser(userId);

    for await (const category of categories) {
      const monthToUse = DateTimeUtils.getMonthNumberFromTimestamp();
      const yearToUse = DateTimeUtils.getYearFromTimestamp();

      const previousMonth = monthToUse > 1 ? monthToUse - 1 : 12;
      const previousMonthsYear = monthToUse > 1 ? yearToUse : yearToUse - 1;
    const previousMonthAmounts = await CategoryService.getAmountForCategoryInMonth(
      category.category_id as bigint,
      previousMonth,
      previousMonthsYear,
      true
    );

      if (previousMonthAmounts) {
      (category as any).avg_previous_month_credit = Math.abs(
        Number(
          ConvertUtils.convertBigIntegerToFloat(
            BigInt(previousMonthAmounts.category_balance_credit ?? 0)
          )
        )
      );

      (category as any).avg_previous_month_debit = Math.abs(
        Number(
          ConvertUtils.convertBigIntegerToFloat(BigInt(previousMonthAmounts.category_balance_debit ?? 0))
        )
      );
      }

      const sameMonthPreviousYearAmounts = await CategoryService.getAmountForCategoryInMonth(category.category_id as bigint, monthToUse, yearToUse - 1, true);
      if (sameMonthPreviousYearAmounts) {
      (category as any).avg_same_month_previous_year_credit = Math.abs(
        Number(
          ConvertUtils.convertBigIntegerToFloat(
            BigInt(sameMonthPreviousYearAmounts.category_balance_credit ?? 0)
          )
        )
      );
      (category as any).avg_same_month_previous_year_debit = Math.abs(
        Number(
          ConvertUtils.convertBigIntegerToFloat(
            BigInt(sameMonthPreviousYearAmounts.category_balance_debit ?? 0)
          )
        )
      );
      }

    const last12MonthsAverageAmounts =
      (await CategoryService.getAverageAmountForCategoryInLast12Months(
        userId,
        category.category_id as bigint
      ));

      if (last12MonthsAverageAmounts) {
        (category as any).avg_12_months_credit = Math.abs(Number(last12MonthsAverageAmounts.category_balance_credit));
        (category as any).avg_12_months_debit = Math.abs(Number(last12MonthsAverageAmounts.category_balance_debit));
      }

    const lifetimeAverageAmounts = (await CategoryService.getAverageAmountForCategoryInLifetime(
      userId,
      category.category_id as bigint
    ));
      if (lifetimeAverageAmounts) {
        (category as any).avg_lifetime_credit = Math.abs(Number(lifetimeAverageAmounts.category_balance_credit));
        (category as any).avg_lifetime_debit = Math.abs(Number(lifetimeAverageAmounts.category_balance_debit));
      }
    }
    return {
      categories: categories,
      initial_balance: "-",
    };
  }

  static async addOrUpdateCategoryValueInBudget(
    userId: bigint,
    budgetId: bigint,
    catId: bigint,
    plannedValueCredit: number,
    plannedValueDebit: number,
    dbClient = prisma
  ) {
    await dbClient.$executeRaw`
      INSERT INTO budgets_has_categories (budgets_budget_id, budgets_users_user_id, categories_category_id, planned_amount_credit, planned_amount_debit)
      VALUES (${budgetId}, ${userId}, ${catId}, ${plannedValueCredit}, ${plannedValueDebit})
      ON DUPLICATE KEY UPDATE planned_amount_credit = ${plannedValueCredit}, planned_amount_debit = ${plannedValueDebit}`;
  }

  private static async parseCatValuesIntoBudgetCategories(
    userId: bigint,
    budgetId: bigint,
    catValuesArr: Array<any>,
    dbClient = prisma
  ) {
    // ADD CAT VALUES TO BUDGET CATEGORIES
    const promises = [];
    for (const catValue of catValuesArr) {
      const plannedValueCredit = ConvertUtils.convertFloatToBigInteger(
        parseFloat(catValue.planned_value_credit)
      );
      const plannedValueDebit = ConvertUtils.convertFloatToBigInteger(
        parseFloat(catValue.planned_value_debit)
      );
      /* Logger.addLog(`cat value debit: ${catValue.planned_value_debit} || converted: ${plannedValueDebit}`);
          Logger.addStringifiedLog(catValue); */

      promises.push(
        this.addOrUpdateCategoryValueInBudget(
          userId,
          budgetId,
          catValue.category_id,
          plannedValueCredit,
          plannedValueDebit,
          dbClient
        )
      );
    }
    return Promise.all(promises);
  }

  static async createBudget(
    userId: bigint,
    month: number,
    year: number,
    catValuesArr: Array<any>,
    observations: string,
    dbClient = undefined
  ) {
    return performDatabaseRequest(async (prismaTx) => {
      const budget = await prismaTx.budgets.create({
        data: {
          month: month,
          year: year,
          observations: observations,
          is_open: true,
          users_user_id: userId,
        },
      });

      await this.parseCatValuesIntoBudgetCategories(userId, budget.budget_id, catValuesArr, prismaTx);
      return budget.budget_id;
    }, dbClient);
  }

  static async getTotalEssentialDebitTransactionsAmountForBudget(
    userId: bigint,
    budget: Prisma.budgetsUpdateInput,
    dbClient = prisma
  ) {
    const month = parseInt(budget.month as any, 10);
    const year = parseInt(budget.year as any, 10);
    const result: any = await dbClient.$queryRaw`
      SELECT sum(amount) as 'amount'
      FROM transactions
      INNER JOIN accounts ON transactions.accounts_account_from_id = accounts.account_id
      WHERE users_user_id = ${userId}
        AND date_timestamp BETWEEN ${new Date(year, month - 1, 1).getTime() / 1000} AND ${new Date(year, month, 0).getTime() / 1000}
        AND transactions.is_essential IS TRUE
        AND (transactions.type = ${MYFIN.TRX_TYPES.EXPENSE} OR transactions.type = ${MYFIN.TRX_TYPES.TRANSFER})`;
    return result[0].amount ? ConvertUtils.convertBigIntegerToFloat(result[0].amount) : 0;
  }

  static async getBudget(userId: bigint, budgetId: number | bigint, dbclient = prisma) {
    const budget = await prisma.budgets.findUnique({
      where: {
        users_user_id: userId,
        budget_id: budgetId,
      },
      select: {
        observations: true,
        month: true,
        year: true,
        is_open: true,
      },
    });

    const month = (budget as any).month;
    const year = (budget as any).year;

    (budget as any).initial_balance = await AccountService.getBalancesSnapshotForMonthForUser(
      userId,
      month > 1 ? month - 1 : 12,
      month > 1 ? year : year - 1,
      true,
      dbclient
    );
    (budget as any).categories = await CategoryService.getAllCategoriesForBudget(userId, budgetId, dbclient);
    (budget as any).debit_essential_trx_total = await this.getTotalEssentialDebitTransactionsAmountForBudget(userId, budget, dbclient);

    for (const category of (budget as any).categories) {
    /*Logger.addLog(`_------_\nCategory: ${category.category_id}`);*/
    const monthToUse = (budget as any).month;
    const yearToUse = (budget as any).year;
      const calculatedAmounts = await CategoryService.getAmountForCategoryInMonth(
        category.category_id,
      monthToUse,
      yearToUse,
        true,
        dbclient
      );
    /*Logger.addLog(`------\nCATEGORY ${category.category_id}`);
    Logger.addStringifiedLog(calculatedAmounts);*/
      const calculatedAmountsFromInvestmentAccounts = await AccountService.getAmountForInvestmentAccountsInMonth(
        category.category_id,
        monthToUse,
        yearToUse,
        dbclient
      );

    /* Logger.addLog(`-----------------------
        Category: ${category.name}
        Calculated amounts: ${JSON.stringify(calculatedAmounts[0])}
        `); */

    // Unrealized gains
    const creditFromInvestmentAccounts = calculatedAmountsFromInvestmentAccounts
      ? calculatedAmountsFromInvestmentAccounts.account_balance_credit
      : 0;
    // Unrealized losses
    const expensesFromInvestmentAccounts = calculatedAmountsFromInvestmentAccounts
      ? calculatedAmountsFromInvestmentAccounts.account_balance_debit
      : 0;
    // remove unrealized gains from budget calcs
    const currentAmountCredit =
      (calculatedAmounts ? calculatedAmounts.category_balance_credit : 0) -
      creditFromInvestmentAccounts;
    /*Logger.addLog(`Current amount credit: ${currentAmountCredit}`);*/
    // remove unrealized losses from budget calcs
      const currentAmountDebit = (calculatedAmounts ? calculatedAmounts.category_balance_debit : 0) - expensesFromInvestmentAccounts;

      category.current_amount_credit = Math.abs(Number(ConvertUtils.convertBigIntegerToFloat(BigInt(currentAmountCredit))));
      category.current_amount_debit = Math.abs(Number(ConvertUtils.convertBigIntegerToFloat(BigInt(currentAmountDebit))));

      category.planned_amount_credit = Number(category.planned_amount_credit);
      category.planned_amount_debit = Number(category.planned_amount_debit);

    const previousMonth = monthToUse > 1 ? monthToUse - 1 : 12;
    const previousMonthsYear = monthToUse > 1 ? yearToUse : yearToUse - 1;
      const previousMonthAmounts = await CategoryService.getAmountForCategoryInMonth(
        category.category_id,
        previousMonth,
        previousMonthsYear,
        true,
        dbclient
      );
      category.avg_previous_month_credit = Math.abs(Number(ConvertUtils.convertBigIntegerToFloat(BigInt(previousMonthAmounts?.category_balance_credit ?? 0))));
      category.avg_previous_month_debit = Math.abs(Number(ConvertUtils.convertBigIntegerToFloat(BigInt(previousMonthAmounts?.category_balance_debit ?? 0))));

      const sameMonthPreviousYearAmounts = await CategoryService.getAmountForCategoryInMonth(
        category.category_id,
      monthToUse,
      yearToUse - 1,
        true,
        dbclient
      );
      category.avg_same_month_previous_year_credit = Math.abs(Number(ConvertUtils.convertBigIntegerToFloat(BigInt(sameMonthPreviousYearAmounts?.category_balance_credit ?? 0))));
    category.avg_same_month_previous_year_debit = Math.abs(
      Number(
        ConvertUtils.convertBigIntegerToFloat(
          BigInt(sameMonthPreviousYearAmounts?.category_balance_debit ?? 0)
        )
      )
    );

    const last12MonthsAverageAmounts =
      (await CategoryService.getAverageAmountForCategoryInLast12Months(
        userId,
        category.category_id,
        dbclient
      ));

    category.avg_12_months_credit = Math.abs(
      Number(last12MonthsAverageAmounts?.category_balance_credit ?? 0)
    );
    category.avg_12_months_debit = Math.abs(
      Number(last12MonthsAverageAmounts?.category_balance_debit ?? 0)
    );

    const lifetimeAverageAmounts = (await CategoryService.getAverageAmountForCategoryInLifetime(
      userId,
      category.category_id,
      dbclient
    ));

      category.avg_lifetime_credit = Math.abs(Number(lifetimeAverageAmounts?.category_balance_credit ?? 0));
      category.avg_lifetime_debit = Math.abs(Number(lifetimeAverageAmounts?.category_balance_debit ?? 0));
    }

    return budget;
  }

  static async updateBudget(
    userId: bigint,
    budgetId: bigint,
    month: number,
    year: number,
    catValuesArr: Array<any>,
    observations: string,
    dbClient = undefined
  ) {
    return performDatabaseRequest(async (prismaTx) => {
      await prismaTx.budgets.update({
        where: {
          users_user_id: userId,
          budget_id: budgetId,
        },
        data: {
          month,
          year,
          observations,
        },
      });
      // ADD CAT VALUES TO BUDGET CATEGORIES
      await this.parseCatValuesIntoBudgetCategories(userId, budgetId, catValuesArr, prismaTx);
    }, dbClient);
  }

  static async changeBudgetStatus(userId: bigint, budgetId: bigint, isOpen: boolean, dbClient = prisma) {
    return dbClient.budgets.update({
      where: {
        users_user_id: userId,
        budget_id: budgetId,
      },
      data: {
        is_open: isOpen,
      },
    });
  }

  static async removeBudget(userId: bigint, budgetId: bigint, dbClient = undefined) {
    return performDatabaseRequest(async (prismaTx) => {
      if (!dbClient) {
        dbClient = prismaTx;
      }
      await dbClient.budgets_has_categories.deleteMany({
        where: {
          budgets_budget_id: budgetId,
          budgets_users_user_id: userId,
        },
      });

      await dbClient.budgets.delete({
        where: {
          budget_id: budgetId,
          users_user_id: userId,
        },
      });
    }, dbClient);
  }

  static async getCountOfUserBudgets(userId: bigint, dbClient = prisma) {
    return dbClient.budgets.count({
      where: { users_user_id: userId },
    });
  }

  static async getBudgetAfterCertainMonth(userId: bigint, month: number, year: number, dbClient = prisma): Promise<Array<Prisma.budgetsUpdateInput>> {
    return dbClient.$queryRaw`
      SELECT month, year, budget_id, users_user_id, observations, is_open, initial_balance
      FROM budgets
      WHERE budgets.users_user_id = ${userId}
        AND ((year = ${year} AND month > ${month}) OR (year > ${year}))
      ORDER BY year ASC, month ASC`;
  }

  static async getBudgetsUntilCertainMonth(userId: bigint, month: number, year: number, ordering: BudgetListOrder, dbClient = prisma): Promise<Array<Prisma.budgetsCreateManyInput>> {
    if (ordering === BudgetListOrder.DESCENDING) {
      return dbClient.$queryRaw`
        SELECT month, year, budget_id, users_user_id, observations, is_open, initial_balance
        FROM budgets
        WHERE budgets.users_user_id = ${userId}
          AND ((year = ${year} AND month < ${month}) OR (year < ${year}))
        ORDER BY year DESC, month DESC`;
    }
    return dbClient.$queryRaw`
      SELECT month, year, budget_id, users_user_id, observations, is_open, initial_balance
      FROM budgets
      WHERE budgets.users_user_id = ${userId}
        AND ((year = ${year} AND month < ${month}) OR (year < ${year}))
      ORDER BY year ASC, month ASC`;
  }

  static async updateBudgetCategoryPlannedValues(
    userId: bigint,
    budgetId: bigint,
    categoryId: bigint,
    plannedExpense?: number,
    plannedIncome?: number,
    dbClient = undefined
  ) {
    return performDatabaseRequest(async (prismaTx) => {
      const currentAmounts = await prismaTx.budgets_has_categories.findUnique({
        where: {
          budgets_budget_id_budgets_users_user_id_categories_category_id: {
            budgets_budget_id: budgetId,
            categories_category_id: categoryId,
            budgets_users_user_id: userId,
          },
        },
        select: {
          planned_amount_credit: true,
          planned_amount_debit: true,
        },
      });

      await this.addOrUpdateCategoryValueInBudget(
        userId,
        budgetId,
        categoryId,
        ConvertUtils.convertFloatToBigInteger(plannedIncome) ?? Number(currentAmounts.planned_amount_credit),
        ConvertUtils.convertFloatToBigInteger(plannedExpense) ?? Number(currentAmounts.planned_amount_debit),
        prismaTx,
      );
    }, dbClient);
  }
}

export default BudgetService;