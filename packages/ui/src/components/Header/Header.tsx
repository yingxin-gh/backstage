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
import { sanitizeUrl } from '@braintree/sanitize-url';
import { Container } from '../Container';
import { Lexer } from 'marked';
import { Link } from '../Link';
import { Fragment, useMemo } from 'react';

/**
 * Parses inline Markdown links in a string and returns an array of React nodes.
 * URLs are sanitized via `@braintree/sanitize-url`; unsafe URLs are rendered as
 * plain text. Uses `marked` instead of `react-markdown` to avoid ESM issues.
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  return Lexer.lexInline(text).map((token, i) => {
    if (token.type === 'link') {
      const href = sanitizeUrl(token.href);
      if (href === 'about:blank') return token.text;
      return (
        <Link key={i} href={href} standalone>
          {token.text}
        </Link>
      );
    }
    return token.raw;
  });
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

  const descriptionNodes = useMemo(
    () => (description ? renderInlineMarkdown(description) : null),
    [description],
  );

  return (
    <Container className={classes.root}>
      {tags && tags.length > 0 && (
        <ul className={classes.tags}>
          {tags.map((tag, i) => (
            <li
              key={`${i}:${tag.label}:${tag.href ?? ''}`}
              className={classes.tag}
            >
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
            </li>
          ))}
        </ul>
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
          {descriptionNodes}
        </Text>
      )}
      {metadata && metadata.length > 0 && (
        <dl className={classes.metaRow}>
          {metadata.map((item, i) => (
            <div key={`${i}:${item.label}`} className={classes.metaItem}>
              <dt>
                <Text variant="body-medium" color="secondary">
                  {item.label}
                </Text>
              </dt>
              <dd>
                {typeof item.value === 'string' ? (
                  <Text variant="body-medium">{item.value}</Text>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {tabs && (
        <div className={classes.tabsWrapper}>
          <HeaderNav tabs={tabs} activeTabId={activeTabId} />
        </div>
      )}
    </Container>
  );
};

/**
 * @public
 * @deprecated Use {@link Header} instead.
 */
export const HeaderPage = Header;
