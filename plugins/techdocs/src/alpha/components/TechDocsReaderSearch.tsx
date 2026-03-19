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

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Text,
  Flex,
  SearchAutocomplete,
  SearchAutocompleteItem,
} from '@backstage/ui';
import {
  SearchContextProvider,
  useSearch,
} from '@backstage/plugin-search-react';
import { CompoundEntityRef } from '@backstage/catalog-model';
import { ResultHighlight } from '@backstage/plugin-search-common';
import { HighlightedSearchResultText } from '@backstage/plugin-search-react';

type TechDocsDoc = {
  namespace: string;
  kind: string;
  name: string;
  path: string;
  location: string;
  title: string;
  text: string;
};

type TechDocsSearchResult = {
  type: string;
  document: TechDocsDoc;
  highlight?: ResultHighlight;
};

type TechDocsReaderSearchBarProps = {
  entityId: CompoundEntityRef;
};

const TechDocsReaderSearchBar = (props: TechDocsReaderSearchBarProps) => {
  const { entityId } = props;
  const navigate = useNavigate();
  const {
    setFilters,
    setTerm,
    term,
    result: { loading, value: searchVal },
  } = useSearch();
  const [results, setResults] = useState<TechDocsSearchResult[]>([]);
  const [deferredLoading, setDeferredLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (searchVal) {
      setResults(searchVal.results.slice(0, 10) as TechDocsSearchResult[]);
    }
  }, [loading, searchVal]);

  useEffect(() => {
    clearTimeout(loadingTimer.current);
    setDeferredLoading(false);
    if (loading) {
      loadingTimer.current = setTimeout(() => setDeferredLoading(true), 200);
    }
    return () => clearTimeout(loadingTimer.current);
  }, [term, loading]);

  const { kind, name, namespace } = entityId;
  useEffect(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      kind,
      namespace,
      name,
    }));
  }, [kind, namespace, name, setFilters]);

  return (
    <SearchAutocomplete
      aria-label="Search docs"
      placeholder="Search docs"
      size="small"
      inputValue={term}
      onInputChange={setTerm}
      isLoading={deferredLoading}
      popoverWidth="min(720px, calc(100vw - 32px))"
      popoverPlacement="bottom end"
    >
      {results.map((result, index) => (
        <SearchAutocompleteItem
          key={index}
          id={String(index)}
          textValue={result.document.title}
          onAction={() => {
            setTerm('');
            navigate(result.document.location);
            requestAnimationFrame(() => {
              (document.activeElement as HTMLElement)?.blur();
            });
          }}
        >
          <Flex direction="column" gap="1">
            <Text weight="bold">
              {result.highlight?.fields.title ? (
                <HighlightedSearchResultText
                  text={result.highlight.fields.title}
                  preTag={result.highlight.preTag}
                  postTag={result.highlight.postTag}
                />
              ) : (
                result.document.title
              )}
            </Text>
            {(result.highlight?.fields.text || result.document.text) && (
              <Text
                variant="body-small"
                color="secondary"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {result.highlight?.fields.text ? (
                  <HighlightedSearchResultText
                    text={result.highlight.fields.text}
                    preTag={result.highlight.preTag}
                    postTag={result.highlight.postTag}
                  />
                ) : (
                  result.document.text
                )}
              </Text>
            )}
          </Flex>
        </SearchAutocompleteItem>
      ))}
    </SearchAutocomplete>
  );
};

export type TechDocsReaderSearchProps = {
  entityId: CompoundEntityRef;
};

export const TechDocsReaderSearch = (props: TechDocsReaderSearchProps) => {
  const initialState = {
    term: '',
    types: ['techdocs'],
    pageCursor: '',
    filters: props.entityId,
  };
  return (
    <SearchContextProvider initialState={initialState}>
      <TechDocsReaderSearchBar {...props} />
    </SearchContextProvider>
  );
};
