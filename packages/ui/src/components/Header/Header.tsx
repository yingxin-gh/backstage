/*
 * Copyright 2025 The Backstage Authors
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

import type { HeaderProps } from './types';
import { Text } from '../Text';
import { RiArrowRightSLine } from '@remixicon/react';
import { HeaderNav } from './HeaderNav';
import { useDefinition } from '../../hooks/useDefinition';
import { HeaderDefinition } from './definition';
import { Link } from '../Link';
import { Fragment } from 'react/jsx-runtime';

const INLINE_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Renders a plain-text string that may contain inline Markdown links of the
 * form `[label](href)` as an array of React nodes (strings and Link elements).
 *
 * We intentionally avoid `react-markdown` here: that package is ESM-only
 * (v8+), which breaks Jest in Node-role packages that transitively import
 * `@backstage/ui` (e.g. via `core-app-api`). Since the Header description only
 * needs inline link support, a small regex-based parser is sufficient and keeps
 * this package free of ESM dependencies.
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE_LINK_RE.lastIndex = 0;
  while ((match = INLINE_LINK_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <Link key={match.index} href={match[2]} standalone>
        {match[1]}
      </Link>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

/**
 * A secondary header with title, breadcrumbs, tabs, and actions.
 *
 * @public
 */
export const Header = (props: HeaderProps) => {
  const { ownProps } = useDefinition(HeaderDefinition, props);
  const {
    classes,
    title,
    tabs,
    activeTabId,
    customActions,
    breadcrumbs,
    description,
    tags,
    metadata,
  } = ownProps;

  return (
    <div className={classes.root}>
      {tags && tags.length > 0 && (
        <div className={classes.tags}>
          {tags.map((tag, i) => (
            <Fragment key={tag.label}>
              {i > 0 && <span className={classes.tagDivider} aria-hidden />}
              {tag.href ? (
                <Link
                  href={tag.href}
                  variant="body-medium"
                  color="secondary"
                  standalone
                >
                  {tag.label}
                </Link>
              ) : (
                <Text variant="body-medium" color="secondary">
                  {tag.label}
                </Text>
              )}
            </Fragment>
          ))}
        </div>
      )}
      <div className={classes.content}>
        <div className={classes.breadcrumbs}>
          {breadcrumbs &&
            breadcrumbs.map(breadcrumb => (
              <Fragment key={breadcrumb.label}>
                <Link
                  href={breadcrumb.href}
                  variant="title-small"
                  weight="bold"
                  color="secondary"
                  truncate
                  style={{ maxWidth: '240px' }}
                  standalone
                >
                  {breadcrumb.label}
                </Link>
                <RiArrowRightSLine size={16} color="var(--bui-fg-secondary)" />
              </Fragment>
            ))}
          <Text variant="title-small" weight="bold" as="h2">
            {title}
          </Text>
        </div>
        <div className={classes.controls}>{customActions}</div>
      </div>
      {description && (
        <Text
          variant="body-medium"
          color="secondary"
          className={classes.description}
        >
          {renderInlineMarkdown(description)}
        </Text>
      )}
      {metadata && metadata.length > 0 && (
        <div className={classes.metaRow}>
          {metadata.map(item => (
            <div key={item.label} className={classes.metaItem}>
              <Text variant="body-medium" color="secondary">
                {item.label}
              </Text>
              <Text variant="body-medium">{item.value}</Text>
            </div>
          ))}
        </div>
      )}
      {tabs && (
        <div className={classes.tabsWrapper}>
          <HeaderNav tabs={tabs} activeTabId={activeTabId} />
        </div>
      )}
    </div>
  );
};

/**
 * @public
 * @deprecated Use {@link Header} instead.
 */
export const HeaderPage = Header;
