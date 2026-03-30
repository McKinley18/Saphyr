/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.alterTable('accounts', table => {
    table.string('type').notNullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  // Can't easily go back to an enum automatically with all DB values
  return knex.schema.alterTable('accounts', table => {
    table.string('type').notNullable().alter();
  });
};
