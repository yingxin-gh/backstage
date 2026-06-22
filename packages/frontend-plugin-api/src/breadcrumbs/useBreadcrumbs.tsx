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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createVersionedContext,
  createVersionedValueMap,
  useVersionedContext,
} from '@backstage/version-bridge';
import type { BreadcrumbEntry } from './types';

interface InternalEntry extends BreadcrumbEntry {
  depth: number;
}

interface Registration {
  update(label: string, href: string): void;
  unregister(): void;
}

interface BreadcrumbsContextValue {
  breadcrumbs: BreadcrumbEntry[];
  register: (entry: InternalEntry) => Registration;
}

const CONTEXT_KEY = 'breadcrumbs-context';
const DEPTH_KEY = 'breadcrumbs-depth';

type ContextMap = { 1: BreadcrumbsContextValue };
type DepthMap = { 1: number };

const BreadcrumbsContext = createVersionedContext<ContextMap>(CONTEXT_KEY);
const DepthContext = createVersionedContext<DepthMap>(DEPTH_KEY);

const EMPTY: BreadcrumbEntry[] = [];

/**
 * Provides the breadcrumb registry to the component tree. Place this near the
 * top of the app so that all nested {@link BreadcrumbRegistration} components
 * can register entries and {@link useBreadcrumbs} consumers can read them.
 *
 * @public
 */
export function BreadcrumbsRegistryProvider(props: { children: ReactNode }) {
  const [entries, setEntries] = useState<InternalEntry[]>([]);

  const register = useCallback((entry: InternalEntry): Registration => {
    const record = { ...entry };
    setEntries(prev => [...prev, record].sort((a, b) => a.depth - b.depth));
    return {
      update(label: string, href: string) {
        if (record.label === label && record.href === href) return;
        record.label = label;
        record.href = href;
        setEntries(prev => [...prev]);
      },
      unregister() {
        setEntries(prev => prev.filter(e => e !== record));
      },
    };
  }, []);

  const breadcrumbs = useMemo(
    () => entries.map(({ label, href }) => ({ label, href })),
    [entries],
  );

  const value = useMemo(
    () => createVersionedValueMap({ 1: { breadcrumbs, register } }),
    [breadcrumbs, register],
  );

  return (
    <BreadcrumbsContext.Provider value={value}>
      {props.children}
    </BreadcrumbsContext.Provider>
  );
}

/**
 * Returns the current breadcrumb trail registered by page components anywhere
 * in the tree. Call this in components that render breadcrumbs (e.g. PluginHeader).
 *
 * @public
 */
export function useBreadcrumbs(): BreadcrumbEntry[] {
  const ctx = useVersionedContext<ContextMap>(CONTEXT_KEY);
  return ctx?.atVersion(1)?.breadcrumbs ?? EMPTY;
}

/**
 * Registers a breadcrumb entry for the current page. The entry is added on
 * mount and removed on unmount. Wraps its children and increments the depth
 * counter so nested registrations are ordered correctly.
 *
 * @public
 */
export function BreadcrumbRegistration(props: {
  entry: BreadcrumbEntry;
  children: ReactNode;
}) {
  const ctx = useVersionedContext<ContextMap>(CONTEXT_KEY);
  const register = ctx?.atVersion(1)?.register;
  const depthCtx = useVersionedContext<DepthMap>(DEPTH_KEY);
  const depth = depthCtx?.atVersion(1) ?? 0;
  const { label, href } = props.entry;
  const registrationRef = useRef<Registration | null>(null);

  useEffect(() => {
    if (!register) return undefined;
    const reg = register({ label, href, depth });
    registrationRef.current = reg;
    return () => {
      reg.unregister();
      registrationRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, depth]);

  useEffect(() => {
    registrationRef.current?.update(label, href);
  }, [label, href]);

  const depthValue = useMemo(
    () => createVersionedValueMap({ 1: depth + 1 }),
    [depth],
  );

  return (
    <DepthContext.Provider value={depthValue}>
      {props.children}
    </DepthContext.Provider>
  );
}
