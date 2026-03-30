/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('full_name');
      table.timestamps(true, true);
    })
    .createTable('accounts', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.enum('type', ['checking', 'savings', 'credit_card', 'loan', 'investment']).notNullable();
      table.decimal('balance', 19, 4).defaultTo(0);
      table.decimal('interest_rate', 5, 4).defaultTo(0); // For credit cards/loans/savings
      table.string('currency').defaultTo('USD');
      table.timestamps(true, true);
    })
    .createTable('transactions', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('account_id').references('id').inTable('accounts').onDelete('CASCADE');
      table.uuid('to_account_id').references('id').inTable('accounts').onDelete('SET NULL'); // For transfers
      table.enum('type', ['income', 'expense', 'transfer']).notNullable();
      table.decimal('amount', 19, 4).notNullable();
      table.string('category').notNullable();
      table.string('description');
      table.date('date').notNullable();
      table.boolean('is_taxable').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('tax_profiles', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('filing_status').notNullable(); // single, married_joint, etc.
      table.string('region').notNullable(); // state/province
      table.decimal('standard_deduction', 19, 4).defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('tax_brackets', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('region').notNullable();
      table.string('filing_status').notNullable();
      table.decimal('lower_bound', 19, 4).notNullable();
      table.decimal('upper_bound', 19, 4);
      table.decimal('rate', 5, 4).notNullable();
      table.integer('year').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('tax_brackets')
    .dropTableIfExists('tax_profiles')
    .dropTableIfExists('transactions')
    .dropTableIfExists('accounts')
    .dropTableIfExists('users');
};
