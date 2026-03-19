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

import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import {
  TechDocsShadowDom,
  useShadowDomStylesLoading,
  useShadowRootElements,
  useTechDocsReaderPage,
} from '@backstage/plugin-techdocs-react';
import { Progress } from '@backstage/core-components';

import { TechDocsStateIndicator } from '../../reader/components/TechDocsStateIndicator';

import { useTechDocsReaderDom } from '../../reader/components/TechDocsReaderPageContent/dom';
import {
  useTechDocsReader,
  withTechDocsReaderProvider,
} from '../../reader/components/TechDocsReaderProvider';
import { TechDocsReaderPageContentAddons } from '../../reader/components/TechDocsReaderPageContent/TechDocsReaderPageContentAddons';
import { useApp } from '@backstage/core-plugin-api';
import type { TechDocsReaderPageContentProps } from '../../reader/components/TechDocsReaderPageContent/TechDocsReaderPageContent';

export const TechDocsReaderContent = withTechDocsReaderProvider(
  (props: TechDocsReaderPageContentProps) => {
    const { onReady } = props;

    const {
      entityMetadata: { value: entityMetadata, loading: entityMetadataLoading },
      entityRef,
      setShadowRoot,
    } = useTechDocsReaderPage();
    const { state } = useTechDocsReader();
    const dom = useTechDocsReaderDom(entityRef, props.defaultPath);
    const location = useLocation();
    const path = location.pathname;
    const hash = location.hash;
    const isStyleLoading = useShadowDomStylesLoading(dom);
    const [hashElement] = useShadowRootElements([`[id="${hash.slice(1)}"]`]);
    const app = useApp();
    const { NotFoundErrorPage } = app.getComponents();

    useEffect(() => {
      if (isStyleLoading) return;

      if (hash) {
        if (hashElement) {
          hashElement.scrollIntoView();
          const link = hashElement.querySelector<HTMLElement>('a.headerlink');
          if (link) {
            link.focus();
          }
        }
      } else {
        document?.querySelector('header')?.scrollIntoView();
      }
    }, [path, hash, hashElement, isStyleLoading]);

    const handleAppend = useCallback(
      (newShadowRoot: ShadowRoot) => {
        setShadowRoot(newShadowRoot);
        if (onReady instanceof Function) {
          onReady();
        }
      },
      [setShadowRoot, onReady],
    );

    // No entity metadata = 404. Don't render content at all.
    if (entityMetadataLoading === false && !entityMetadata)
      return <NotFoundErrorPage />;

    // Do not return content until dom is ready; instead, render a state
    // indicator, which handles progress and content errors on our behalf.
    if (!dom) {
      return <TechDocsStateIndicator />;
    }

    return (
      <>
        <TechDocsStateIndicator />
        {(state === 'CHECKING' || isStyleLoading) && <Progress />}
        <TechDocsShadowDom element={dom} onAppend={handleAppend}>
          <TechDocsReaderPageContentAddons />
        </TechDocsShadowDom>
      </>
    );
  },
);
