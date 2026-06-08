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

/**
 * Tunes autovacuum thresholds and fixes the `n_distinct` estimate on
 * the `search` table.
 *
 * ## Autovacuum scale factors
 *
 * The `search` table experiences high churn: every entity stitch
 * deletes and re-inserts all of the entity's search rows. At the
 * default `autovacuum_vacuum_scale_factor` of 0.2, autovacuum only
 * triggers after ~2.7M rows change on a 13.6M-row table. By that
 * point the visibility map has degraded enough that PostgreSQL avoids
 * index-only scans on the covering indexes, falling back to
 * sequential scans of the entire table.
 *
 * Setting both scale factors to 0.01 triggers autovacuum after ~136K
 * row changes, keeping the visibility map healthy and enabling
 * index-only scans on `search_key_value_entity_idx`.
 *
 * ## n_distinct override
 *
 * The default ANALYZE samples ~30K rows. With ~490K distinct
 * `entity_id` values in a 13.6M-row table, the sample consistently
 * underestimates `n_distinct` by ~12x (e.g. 38K estimated vs 490K
 * actual). This causes the planner to severely underestimate the
 * output of HashAggregate nodes in catalog list queries.
 *
 * Setting `n_distinct = -1` tells the planner to assume the column
 * has as many distinct values as there are rows. This is a slight
 * overestimate (the actual ratio is ~1:28), but it is far more
 * accurate than the sampled estimate and safe for planning purposes.
 *
 * ## Cost
 *
 * Both operations are metadata-only (instant) on any table size.
 * They modify `pg_class.reloptions` and `pg_attribute.attoptions`
 * respectively — no table scan, no lock contention.
 *
 * MySQL and SQLite do not support these settings; this migration is a
 * no-op on those engines.
 */

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  if (!knex.client.config.client.includes('pg')) {
    return;
  }

  await knex.raw(
    `ALTER TABLE search SET (
      autovacuum_vacuum_scale_factor = 0.01,
      autovacuum_analyze_scale_factor = 0.01
    )`,
  );

  await knex.raw(
    `ALTER TABLE search ALTER COLUMN entity_id SET (n_distinct = -1)`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  if (!knex.client.config.client.includes('pg')) {
    return;
  }

  await knex.raw(
    `ALTER TABLE search RESET (
      autovacuum_vacuum_scale_factor,
      autovacuum_analyze_scale_factor
    )`,
  );

  await knex.raw(
    `ALTER TABLE search ALTER COLUMN entity_id RESET (n_distinct)`,
  );
};
