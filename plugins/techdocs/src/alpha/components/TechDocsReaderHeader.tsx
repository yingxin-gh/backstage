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

import { useEffect } from 'react';
import Helmet from 'react-helmet';
import { Header, ButtonLink } from '@backstage/ui';
import { RiCodeLine } from '@remixicon/react';
import {
  TechDocsAddonLocations as locations,
  useTechDocsAddons,
  useTechDocsReaderPage,
} from '@backstage/plugin-techdocs-react';
import { entityPresentationApiRef } from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import capitalize from 'lodash/capitalize';
import { useParams } from 'react-router-dom';
import { TechDocsReaderSearch } from './TechDocsReaderSearch';

export type TechDocsReaderHeaderProps = {
  withSearch?: boolean;
};

export const TechDocsReaderHeader = (props: TechDocsReaderHeaderProps) => {
  const { withSearch = true } = props;
  const addons = useTechDocsAddons();
  const configApi = useApi(configApiRef);
  const entityPresentationApi = useApi(entityPresentationApiRef);
  const { '*': path = '' } = useParams();

  const {
    title,
    setTitle,
    setSubtitle,
    entityRef,
    metadata: { value: metadata, loading: metadataLoading },
    entityMetadata: { value: entityMetadata, loading: entityMetadataLoading },
  } = useTechDocsReaderPage();

  useEffect(() => {
    if (!metadata) return;
    setTitle(metadata.site_name);
    setSubtitle(() => {
      let { site_description } = metadata;
      if (!site_description || site_description === 'None') {
        site_description = '';
      }
      return site_description;
    });
  }, [metadata, setTitle, setSubtitle]);

  const appTitle = configApi.getOptional('app.title') || 'Backstage';
  const locationMetadata = entityMetadata?.locationMetadata;
  const showSourceLink =
    locationMetadata &&
    locationMetadata.type !== 'dir' &&
    locationMetadata.type !== 'file';

  // Hide header on 404 pages
  const noEntMetadata = !entityMetadataLoading && entityMetadata === undefined;
  const noTdMetadata = !metadataLoading && metadata === undefined;
  if (noEntMetadata || noTdMetadata) return null;

  const stringEntityRef = stringifyEntityRef(entityRef);
  const entityDisplayName =
    entityPresentationApi.forEntity(stringEntityRef).snapshot.primaryTitle;

  const removeTrailingSlash = (str: string) => str.replace(/\/$/, '');
  const normalizeAndSpace = (str: string) =>
    str.replace(/[-_]/g, ' ').split(' ').map(capitalize).join(' ');

  let techdocsTabTitleItems: string[] = [];
  if (path !== '')
    techdocsTabTitleItems = removeTrailingSlash(path)
      .split('/')
      .map(normalizeAndSpace);

  const tabTitleItems = [entityDisplayName, ...techdocsTabTitleItems, appTitle];
  const tabTitle = tabTitleItems.join(' | ');

  return (
    <>
      <Helmet titleTemplate="%s">
        <title>{tabTitle}</title>
      </Helmet>
      <Header
        title={title || ''}
        customActions={
          <>
            {withSearch && <TechDocsReaderSearch entityId={entityRef} />}
            {showSourceLink && (
              <ButtonLink
                href={locationMetadata.target}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="small"
                iconStart={<RiCodeLine />}
                aria-label="View source"
              />
            )}
            {addons.renderComponentsByLocation(locations.Header)}
          </>
        }
      />
    </>
  );
};
