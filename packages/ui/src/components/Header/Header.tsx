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
import { Container } from '../Container';
import { Link } from '../Link';
import { Fragment } from 'react/jsx-runtime';
import ReactMarkdown from 'react-markdown';

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
    <Container className={classes.root}>
      {tags && tags.length > 0 && (
        <div className={classes.tags}>
          {tags.map((tag, i) => (
            <Fragment key={tag.label}>
              {i > 0 && <span className={classes.tagDivider} aria-hidden />}
              {tag.href ? (
                <Link href={tag.href} variant="body-small" standalone>
                  {tag.label}
                </Link>
              ) : (
                <Text variant="body-small" color="secondary">
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
        <ReactMarkdown
          className={classes.description}
          allowedElements={['p', 'a', 'strong', 'em']}
          unwrapDisallowed
          components={{
            p: ({ children }) => (
              <Text variant="body-medium" color="secondary">
                {children}
              </Text>
            ),
            a: ({ href, children }) => (
              <Link href={href ?? ''} standalone>
                {children}
              </Link>
            ),
          }}
        >
          {description}
        </ReactMarkdown>
      )}
      {metadata && metadata.length > 0 && (
        <div className={classes.metaRow}>
          {metadata.map(item => (
            <Text key={item.label} variant="body-small" color="secondary">
              <strong>{item.label}:</strong> {item.value}
            </Text>
          ))}
        </div>
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
