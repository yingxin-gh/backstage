/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @ts-check

const { createHash } = require('node:crypto');

const BATCH_SIZE = 1000;

/**
 * Adds a `location_entity_ref` column to the `locations` table.
 *
 * The column stores the full entity ref of the Location kind entity that
 * corresponds to each row, e.g. `location:default/generated-<sha1hex>`. This
 * is pre-computed and stored so that all reads can use the persisted value
 * instead of recomputing the hash from type+target.
 *
 * The column is NOT NULL. The internal bootstrap location row (which will be
 * removed in a future migration) gets an empty string as a placeholder value.
 *
 * The migration adds the column as nullable first, fills every row, then
 * tightens it to NOT NULL. This avoids the MySQL strict-mode restriction that
 * TEXT columns cannot have DEFAULT values.
 *
 * Postgres:  one `UPDATE … FROM unnest(ids::uuid[], refs::text[])` per batch,
 *            then `ALTER COLUMN … SET NOT NULL` (no table rewrite needed).
 * MySQL:     one `UPDATE … INNER JOIN (SELECT … UNION ALL …)` per batch,
 *            then `MODIFY COLUMN … NOT NULL`.
 * SQLite:    transaction-wrapped per-row updates, then knex table-recreation
 *            to enforce NOT NULL.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const client = knex.client.config.client;

  // Step 1: Add column as nullable so the schema change itself needs no data.
  await knex.schema.alterTable('locations', table => {
    table
      .text('location_entity_ref')
      .nullable()
      .comment(
        'The entity ref of the corresponding Location kind entity, e.g. location:default/generated-<sha1hex>',
      );
  });

  // Step 2: Bootstrap row gets an empty string placeholder.
  await knex('locations')
    .where('type', 'bootstrap')
    .update({ location_entity_ref: '' });

  // Step 3: Compute and fill entity refs for all non-bootstrap rows.
  const rows = await knex('locations')
    .whereNot('type', 'bootstrap')
    .select('id', 'type', 'target');

  if (rows.length > 0) {
    /** @type {Array<{ id: string; location_entity_ref: string }>} */
    const computed = rows.map(row => ({
      id: row.id,
      location_entity_ref: `location:default/generated-${createHash('sha1')
        .update(`${row.type}:${row.target}`)
        .digest('hex')}`.toLocaleLowerCase('en-US'),
    }));

    if (client === 'pg') {
      // Single round trip per batch: pass both arrays to unnest and JOIN back.
      for (let i = 0; i < computed.length; i += BATCH_SIZE) {
        const batch = computed.slice(i, i + BATCH_SIZE);
        await knex.raw(
          `UPDATE locations
           SET location_entity_ref = data.ref
           FROM unnest(?::uuid[], ?::text[]) AS data(id, ref)
           WHERE locations.id = data.id`,
          [batch.map(r => r.id), batch.map(r => r.location_entity_ref)],
        );
      }
    } else if (client.includes('mysql')) {
      // Single round trip per batch: JOIN against an inline UNION ALL subquery.
      for (let i = 0; i < computed.length; i += BATCH_SIZE) {
        const batch = computed.slice(i, i + BATCH_SIZE);
        const unionParts = batch
          .map(() => 'SELECT ? AS id, ? AS ref')
          .join(' UNION ALL ');
        const bindings = batch.flatMap(r => [r.id, r.location_entity_ref]);
        await knex.raw(
          `UPDATE locations
           INNER JOIN (${unionParts}) AS data ON locations.id = data.id
           SET locations.location_entity_ref = data.ref`,
          bindings,
        );
      }
    } else {
      // SQLite: wrap all per-row updates in a single transaction.
      await knex.transaction(async tx => {
        for (const row of computed) {
          await tx('locations')
            .where('id', row.id)
            .update({ location_entity_ref: row.location_entity_ref });
        }
      });
    }
  }

  // Step 4: Tighten to NOT NULL now that every row has a value.
  if (client === 'pg') {
    // SET NOT NULL is a metadata-only change on Postgres when no NULLs exist;
    // it does not rewrite the table.
    await knex.raw(
      'ALTER TABLE locations ALTER COLUMN location_entity_ref SET NOT NULL',
    );
  } else {
    // MySQL: MODIFY COLUMN rewrites the column definition.
    // SQLite: knex recreates the table to enforce the NOT NULL constraint.
    await knex.schema.alterTable('locations', table => {
      table.text('location_entity_ref').notNullable().alter();
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  const isSQLite = knex.client.config.client.includes('sqlite');
  if (isSQLite) {
    await knex.raw('ALTER TABLE locations DROP COLUMN location_entity_ref');
  } else {
    await knex.schema.alterTable('locations', table => {
      table.dropColumn('location_entity_ref');
    });
  }
};
